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
import { cache } from "react";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { billingConfig, dodoPayments } from "~/lib/billing";
import { AuthService } from "~/lib/server/auth-service";
import { handleBillingWebhook } from "~/lib/server/billing.server";
import { env, isProduction } from "~/lib/server/env-validation.server";
import { getActiveOrganization } from "~/lib/server/organization.server";

export const auth = betterAuth({
	experimental: {
		joins: true,
	},
	appName: "KaamSync",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	// Built-in rate limiting (Better Auth v1.4+)
	// Handles all /api/auth/* routes automatically
	rateLimit: {
		enabled: true,
		window: 60, // 60 seconds
		max: 100, // 100 requests per window (global default)
		customRules: {
			// Zero sync endpoints - moderate limits
			"/api/zero/*": { window: 60, max: 30 },
			// Auth endpoints - strict limits to prevent brute force
			"/api/auth/sign-in/*": { window: 60, max: 10 },
			"/api/auth/sign-up/*": { window: 60, max: 5 },
			"/api/auth/forgot-password": { window: 300, max: 3 }, // 5 min window
			"/api/auth/reset-password": { window: 300, max: 5 },
			"/api/auth/verify-email": { window: 60, max: 10 },
			// Billing endpoints - moderate limits
			"/api/auth/dodopayments/checkout/*": { window: 60, max: 5 },
			"/api/billing/*": { window: 60, max: 10 },
			// Notifications - moderate limits for normal use
			"/api/notifications/send": { window: 60, max: 30 },
			"/api/notifications/subscribe": { window: 60, max: 20 },
		},
		storage: "memory",
	},
	// IP address detection for rate limiting
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
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
			maxAge: 24 * 60 * 60, // 1 day cache duration (reduced from 7 days for security)
			strategy: "jwe", // can be "jwt" or "compact"
			refreshCache: true, // Enable stateless refresh
		},
	},
	account: {
		modelName: "accountsTable",
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
		storeStateStrategy: "cookie",
		storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
	},
	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					const activeOrganizationId = await getActiveOrganization(
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
			organizationHooks: {
				afterAcceptInvitation: async ({ member }) => {
					if (member.organizationId) {
						await AuthService.handleMembershipChange(member.organizationId);
					}
				},
				afterAddMember: async ({ member }) => {
					if (member.organizationId) {
						await AuthService.handleMembershipChange(member.organizationId);
					}
				},
				afterRemoveMember: async ({ member }) => {
					if (member.organizationId) {
						await AuthService.handleMembershipChange(member.organizationId);
					}
				},
			},
		}),
		// Dodo Payments billing integration
		...(dodoPayments && billingConfig.webhookSecret
			? [
					dodopayments({
						client: dodoPayments,
						createCustomerOnSignUp: true,
						use: [
							checkout({
								products: [
									// Growth plans (monthly & yearly)
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
									// Pro plans (monthly & yearly)
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
								// Primary webhook handler - register this URL in Dodo Payments dashboard:
								// https://your-domain.com/api/auth/dodopayments/webhooks
								onPayload: async (payload) => {
									// Cast to unknown first to handle type differences between SDK versions
									await handleBillingWebhook(
										payload as unknown as Parameters<
											typeof handleBillingWebhook
										>[0],
									);
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
