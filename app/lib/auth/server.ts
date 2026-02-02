import {
	checkout,
	dodopayments,
	portal,
	usage,
	webhooks,
} from "@dodopayments/better-auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import * as authSchema from "~/db/schema/auth";
import * as billingSchema from "~/db/schema/billing";
import * as commentsSchema from "~/db/schema/comments";
import * as mattersSchema from "~/db/schema/matters";
import * as notificationsSchema from "~/db/schema/notifications";
import * as storageSchema from "~/db/schema/storage";
import * as teamsSchema from "~/db/schema/teams";
import * as timelinesSchema from "~/db/schema/timelines";

const schema = {
	...authSchema,
	...billingSchema,
	...commentsSchema,
	...mattersSchema,
	...notificationsSchema,
	...storageSchema,
	...teamsSchema,
	...timelinesSchema,
};

import { AuthService } from "~/lib/auth/service";
import {
	billingConfig,
	clearSubscriptionCache,
	dodoPayments as dodo,
	parseWebhookAddons,
	resolveProductPlan,
} from "~/lib/billing/service";
import { env, isDevelopment, isProduction } from "~/lib/infra/env";
import {
	findSubscriptionId,
	getActiveOrganizationId,
} from "~/lib/organization/service";

// =============================================================================
// SHARED WEBHOOK HELPER
// =============================================================================

export const auth = betterAuth({
	experimental: {
		joins: true,
	},
	appName: "KaamSync",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),

	trustedOrigins: isDevelopment
		? ["http://localhost:3000"]
		: ["https://kaamsync.com", "https://kaamsync.edernel.com"],

	// Handles all /api/auth/* routes automatically
	rateLimit: {
		enabled: true,
		window: 60, // 60 seconds
		max: 100, // 100 requests per window (global default)
		// storage: "database",
		storage: "memory",
		customRules: {
			// Zero sync endpoints - moderate limits
			// "/api/zero/*": { window: 60, max: 30 },
			// Auth endpoints - strict limits to prevent brute force
			"/api/auth/sign-in/*": { window: 60, max: 10 },
			"/api/auth/sign-up/*": { window: 60, max: 5 },
			"/api/auth/forgot-password": { window: 300, max: 3 }, // 5 min window
			"/api/auth/reset-password": { window: 300, max: 5 },
			"/api/auth/verify-email": { window: 60, max: 10 },
			// Billing endpoints - moderate limits
			"/api/auth/dodopayments/*": { window: 60, max: 5 },
			// "/api/billing/*": { window: 60, max: 10 },
			// Notifications - moderate limits for normal use
			// "/api/notifications/send": { window: 60, max: 30 },
			// "/api/notifications/subscribe": { window: 60, max: 20 },
		},
	},
	// IP address detection for rate limiting
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
		},
		crossSubDomainCookies: {
			enabled: true,
			domain: isDevelopment ? "localhost" : "kaamsync.com", // your domain
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: isProduction,
		sendResetPassword: AuthService.sendResetPasswordEmail,
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: AuthService.sendVerificationEmail,
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID!,
			clientSecret: env.GOOGLE_CLIENT_SECRET!,
		},
	},
	session: {
		modelName: "sessionsTable",
		expiresIn: 60 * 60 * 24 * 30, // 30 days (reduced from 1 year for security)
		updateAge: 60 * 60 * 24, // 1 day - refresh session daily
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 minutes - balance between DB hits and security
			strategy: "compact",
		},
	},
	account: {
		modelName: "accountsTable",
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
		storeStateStrategy: "database",
	},
	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					const activeOrganizationId = await getActiveOrganizationId(
						session.userId,
					);
					return {
						data: {
							...session,
							activeOrganizationId,
						},
					};
				},
			},
		},
	},
	plugins: [
		organization({
			schema: {
				organization: {
					modelName: "organizationsTable",
				},
				member: {
					modelName: "membersTable",
				},
				invitation: {
					modelName: "invitationsTable",
				},
			},

			sendInvitationEmail: AuthService.sendInvitationEmail,
		}),
		// Dodo Payments billing integration
		...(dodo && billingConfig.webhookSecret
			? [
					dodopayments({
						client: dodo,
						createCustomerOnSignUp: true,
						use: [
							checkout({
								products: [
									...(env.DODO_PRODUCT_GROWTH_MONTHLY
										? [
												{
													productId: env.DODO_PRODUCT_GROWTH_MONTHLY,
													slug: "growth-monthly",
												},
											]
										: []),
									...(env.DODO_PRODUCT_GROWTH_YEARLY
										? [
												{
													productId: env.DODO_PRODUCT_GROWTH_YEARLY,
													slug: "growth-yearly",
												},
											]
										: []),
									...(env.DODO_PRODUCT_PROFESSIONAL_MONTHLY
										? [
												{
													productId: env.DODO_PRODUCT_PROFESSIONAL_MONTHLY,
													slug: "pro-monthly",
												},
											]
										: []),
									...(env.DODO_PRODUCT_PROFESSIONAL_YEARLY
										? [
												{
													productId: env.DODO_PRODUCT_PROFESSIONAL_YEARLY,
													slug: "pro-yearly",
												},
											]
										: []),
								],
								successUrl: billingConfig.successUrl,
								authenticatedUsersOnly: true,
							}),
							portal(),
							usage(),
							webhooks({
								webhookKey: billingConfig.webhookSecret,

								onSubscriptionActive: async (payload) => {
									const data = payload.data;

									const orgId = data.metadata?.organizationId;
									if (!orgId) return;

									const existingId = await findSubscriptionId(
										orgId,
										data.customer.customer_id,
									);

									const plan = resolveProductPlan(data.product_id);
									if (!plan) return;

									const { purchasedSeats, purchasedStorageGB } =
										parseWebhookAddons(data.addons ?? []);

									const subscriptionData = {
										plan,
										productId: data.product_id,
										billingSubscriptionId: data.subscription_id,
										status: data.status,
										purchasedSeats,
										purchasedStorageGB,
										preTaxAmount: data.recurring_pre_tax_amount,
										previousBillingDate: data.previous_billing_date
											? new Date(data.previous_billing_date)
											: null,
										nextBillingDate: data.next_billing_date
											? new Date(data.next_billing_date)
											: null,
										paymentFrequencyInterval: data.payment_frequency_interval,
										onDemand: data.on_demand,
										updatedAt: new Date(),
									};

									if (!existingId) {
										await db.insert(schema.subscriptionsTable).values({
											id: uuid(),
											...subscriptionData,

											billingCustomerId: data.customer.customer_id,
											organizationId: orgId,

											createdAt: new Date(),
										});
									} else {
										await db
											.update(schema.subscriptionsTable)
											.set(subscriptionData)
											.where(eq(schema.subscriptionsTable.id, existingId));
									}

									clearSubscriptionCache(orgId);
								},

								onSubscriptionExpired: async (payload) => {
									if (!payload.data.metadata?.organizationId) return;
									const existingId = await findSubscriptionId(
										payload.data.metadata.organizationId,
										payload.data.customer.customer_id,
									);
									if (!existingId) return;
									await db
										.update(schema.subscriptionsTable)
										.set({ status: payload.data.status, updatedAt: new Date() })
										.where(eq(schema.subscriptionsTable.id, existingId));

									clearSubscriptionCache(payload.data.metadata.organizationId);
								},

								onSubscriptionPlanChanged: async (payload) => {
									const data = payload.data;

									const orgId = data.metadata?.organizationId;
									if (!orgId) return;

									const existingId = await findSubscriptionId(
										orgId,
										data.customer.customer_id,
									);

									const plan = resolveProductPlan(data.product_id);
									if (!plan || !existingId) return;

									const { purchasedSeats, purchasedStorageGB } =
										parseWebhookAddons(data.addons ?? []);

									const subscriptionData = {
										plan,
										productId: data.product_id,
										billingSubscriptionId: data.subscription_id,
										status: data.status,
										purchasedSeats,
										purchasedStorageGB,
										preTaxAmount: data.recurring_pre_tax_amount,
										previousBillingDate: data.previous_billing_date
											? new Date(data.previous_billing_date)
											: null,
										nextBillingDate: data.next_billing_date
											? new Date(data.next_billing_date)
											: null,
										paymentFrequencyInterval: data.payment_frequency_interval,
										onDemand: data.on_demand,
										updatedAt: new Date(),
									};

									await db
										.update(schema.subscriptionsTable)
										.set(subscriptionData)
										.where(eq(schema.subscriptionsTable.id, existingId));

									clearSubscriptionCache(orgId);

									// Optional overage check for plan changes
									// const usage = await fetchOrgUsage(orgId);

									// const effectiveLimit = getEffectiveMemberLimit(
									// 	plan as ProductKey,
									// 	purchasedSeats,
									// );

									// if (effectiveLimit !== -1 && usage.members > effectiveLimit) {
									// 	console.warn(
									// 		`[Billing] Org ${orgId} now over member limit: ${usage.members}/${effectiveLimit}. ` +
									// 			`Plan: ${plan}, purchasedSeats: ${purchasedSeats}. Org is frozen for new member additions.`,
									// 	);
									// }
								},

								onSubscriptionCancelled: async (payload) => {
									const orgId = payload.data.metadata?.organizationId;

									if (!orgId) return;

									const existingId = await findSubscriptionId(
										orgId,
										payload.data.customer.customer_id,
									);

									if (!existingId) return;

									await db
										.update(schema.subscriptionsTable)
										.set({
											status: payload.data.status,
											purchasedSeats: 0,
											purchasedStorageGB: 0,
											updatedAt: new Date(),
										})
										.where(eq(schema.subscriptionsTable.id, existingId));

									clearSubscriptionCache(orgId);

									// const usage = await fetchOrgUsage(orgId);
									// if (usage.members > planLimits.starter.members) {
									// 	console.warn(
									// 		`[Billing] Org ${orgId} subscription cancelled. ` +
									// 			`Members: ${usage.members}/${planLimits.starter.members}. Org frozen for new additions.`,
									// 	);
									// }
								},
							}),
						],
					}),
				]
			: []),
	],
	user: {
		modelName: "usersTable",
	},
	verification: {
		modelName: "verificationsTable",
	},
});

export type Session = typeof auth.$Infer.Session;

export type AuthServerSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export const getServerSession = cache(async (request: Request) => {
	const session = await auth.api.getSession({
		headers: request.headers,
	});

	return session;
});
