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
import { UseSend } from "usesend-js";
import { OrgInvitationEmail } from "~/components/email/org-invitation";
import { VerifyEmail } from "~/components/email/verify-email";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { env } from "~/lib/env";
import {
	DODO_PRODUCT_IDS,
	getPlanLimits,
	PLAN_ID,
	type PlanId,
} from "~/lib/pricing";
import { syncDodoSubscriptionSeats } from "~/lib/server/dodo.server";
import { getActiveOrganization } from "~/lib/server/organization.server";
import { ac, roles } from "./access-control";
import { dodoPayments } from "./dodo";

const usesend = new UseSend(env.USESEND_API_KEY, env.USESEND_SELF_HOSTED_URL);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Validate that organization has capacity for new members based on plan limits.
 * Guests do not count towards limits.
 *
 * @throws Error if organization is not found or member limit reached
 */
async function validateMemberLimit(orgId: string): Promise<void> {
	const org = await db.query.organizationsTable.findFirst({
		where: eq(schema.organizationsTable.id, orgId),
	});

	if (!org) {
		throw new Error(`Organization ${orgId} not found`);
	}

	const planId = (org.plan as PlanId) || PLAN_ID.STARTER;
	const limits = getPlanLimits(planId);

	if (limits.maxMembers !== null) {
		const existingPaidMembers = await db
			.select()
			.from(schema.membersTable)
			.where(eq(schema.membersTable.organizationId, orgId));

		const paidCount = existingPaidMembers.filter(
			(m) => m.role !== "guest",
		).length;

		if (paidCount >= limits.maxMembers) {
			throw new Error(
				`Organization has reached the member limit (${limits.maxMembers}) for the ${org.plan} plan. Upgrade to add more members.`,
			);
		}
	}
}

export const auth = betterAuth({
	experimental: {
		joins: true,
	},
	appName: "KaamSync",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: env.isProduction,
		sendResetPassword: async ({ user, url }) => {
			if (env.isDevelopment) {
				console.log("Reset password link:", url);
				return;
			}

			await usesend.emails.send({
				from: "support@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Reset your password",
				html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
			});
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			if (env.isDevelopment) {
				console.log("Email verification link:", url);
				return;
			}

			await usesend.emails.send({
				from: "welcome@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Verify your email address",
				react: VerifyEmail({ verifyUrl: url }),
			});
		},
	},
	//   trustedOrigins: [process.env.BETTER_AUTH_URL!],
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
		},
	},
	session: {
		modelName: "sessionsTable",
		expiresIn: 60 * 60 * 24 * 365, // 1 year
		updateAge: 60 * 60 * 24 * 365, // 1 year
		disableSessionRefresh: true,
		cookieCache: {
			enabled: true,
			maxAge: 7 * 24 * 60 * 60, // 7 days cache duration
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
		invitation: {
			create: {
				before: async (
					invitation: typeof schema.invitationsTable.$inferInsert,
				) => {
					// Guests don't count towards paid limits, skip check
					if (invitation.role !== "guest") {
						await validateMemberLimit(invitation.organizationId);
					}
					return { data: invitation };
				},
			},
		},
		member: {
			create: {
				before: async (member: typeof schema.membersTable.$inferInsert) => {
					const orgId = member.organizationId;

					// Guests are always allowed to join (they don't count towards paid limits)
					if (member.role !== "guest") {
						await validateMemberLimit(orgId);
					}
					return { data: member };
				},
			},
		},
	},
	plugins: [
		organization({
			schema: {
				organization: {
					modelName: "organizationsTable",
					additionalFields: {
						// Subscription & billing fields
						plan: {
							type: "string",
							required: false,
							defaultValue: PLAN_ID.STARTER,
							input: false, // Don't allow setting via API directly
						},
						planUpdatedAt: {
							type: "date",
							required: false,
							input: false,
						},
						// Dodo Payments customer reference
						customerId: {
							type: "string",
							required: false,
							input: false,
						},
						subscriptionId: {
							type: "string",
							required: false,
							input: false,
						},
						subscriptionStatus: {
							type: "string",
							required: false,
							input: false, // active, canceled, past_due, trialing, etc.
						},
						// For seat-based billing (Business plan)
						billedSeats: {
							type: "number",
							required: false,
							input: false,
						},
						productId: {
							type: "string",
							required: false,
							input: false,
						},
						// Trial tracking
						trialEndsAt: {
							type: "date",
							required: false,
							input: false,
						},
						// Storage usage tracking (in bytes)
						storageUsed: {
							type: "number",
							required: false,
							defaultValue: 0,
							input: false,
						},
					},
				},
				member: {
					modelName: "membersTable",
				},
				invitation: {
					modelName: "invitationsTable",
				},
			},
			teams: {
				enabled: false,
			},

			membershipLimit: 10000,
			async sendInvitationEmail({ email, organization, inviter }) {
				const inviteLink = `${env.SITE_URL}/join`;

				if (env.isDevelopment) {
					console.log(
						`Invitation email to ${email}: ${inviteLink} (organization: ${organization.name}, invited by: ${inviter.user.email})`,
					);
					return;
				}

				await usesend.emails.send({
					from: "KaamSync@mail.kaamsync.com",
					to: email,
					subject: `You're invited to join ${organization.name} on KaamSync`,
					react: OrgInvitationEmail({
						organizationName: organization.name,
						inviterName: inviter.user.name,
						inviterEmail: inviter.user.email,
						inviteLink,
					}),
				});
			},
			ac,
			roles,
			organizationHooks: {
				afterAddMember: async ({ member }) => {
					await syncDodoSubscriptionSeats(member.organizationId);
				},
				afterRemoveMember: async ({ member }) => {
					await syncDodoSubscriptionSeats(member.organizationId);
				},
				afterAcceptInvitation: async ({ member }) => {
					await syncDodoSubscriptionSeats(member.organizationId);
				},
			},
		}),
		dodopayments({
			client: dodoPayments,
			createCustomerOnSignUp: true,
			use: [
				checkout({
					products: [
						// Pro Plan - Flat $29/month
						{
							productId: DODO_PRODUCT_IDS.PRO_MONTHLY,
							slug: "pro_monthly",
						},
						{
							productId: DODO_PRODUCT_IDS.PRO_YEARLY,
							slug: "pro_yearly",
						},
						// Business Plan - $10/user/month (seat-based)
						{
							productId: DODO_PRODUCT_IDS.BUSINESS_MONTHLY,
							slug: "business_monthly",
						},
						{
							productId: DODO_PRODUCT_IDS.BUSINESS_YEARLY,
							slug: "business_yearly",
						},
					],
					successUrl: "/api/billing/callback",
					authenticatedUsersOnly: true,
				}),
				portal(),
				webhooks({
					webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET,
					onPayload: async (payload) => {
						const rawEventType =
							(payload as { event_type?: string; type?: string }).event_type ??
							(payload as { event_type?: string; type?: string }).type;
						console.log("Received Dodo Payments webhook:", rawEventType);

						// Handle payment and subscription-related events
						// Dodo Payments event types include: payment.succeeded, payment.failed,
						// subscription.active, subscription.on_hold, subscription.paused, etc.
						try {
							const eventType = rawEventType ?? "";
							const data = payload.data as {
								subscription_id?: string;
								customer_id?: string;
								product_id?: string;
								status?: string;
								metadata?: { organizationId?: string };
								reference_id?: string;
								referenceId?: string;
								quantity?: number;
								product_cart?: Array<{ product_id: string; quantity: number }>;
							};

							// Use metadata.organizationId when available; otherwise fall back to
							// the checkoutSession referenceId (we pass org.id as referenceId).
							const organizationId =
								data.metadata?.organizationId ??
								data.reference_id ??
								data.referenceId;

							if (!organizationId) {
								console.log(
									"No organizationId in webhook payload, skipping org update",
								);
								return;
							}

							// Determine plan from product ID (check product_cart for multiple products)
							let newPlan: PlanId = PLAN_ID.STARTER;
							const productId =
								data.product_id || data.product_cart?.[0]?.product_id;

							if (
								productId === DODO_PRODUCT_IDS.PRO_MONTHLY ||
								productId === DODO_PRODUCT_IDS.PRO_YEARLY
							) {
								newPlan = PLAN_ID.PRO;
							} else if (
								productId === DODO_PRODUCT_IDS.BUSINESS_MONTHLY ||
								productId === DODO_PRODUCT_IDS.BUSINESS_YEARLY
							) {
								newPlan = PLAN_ID.BUSINESS;
							}

							// Handle different event types based on Dodo Payments events
							const activationEvents = [
								"payment.succeeded",
								"subscription.active",
							];
							const cancellationEvents = [
								"subscription.cancelled",
								"subscription.expired",
								"subscription.failed",
								"refund.succeeded",
							];

							if (activationEvents.includes(eventType)) {
								// Update organization. Use type-cast to allow updating additionalFields
								// defined in auth.ts but not present in the manual Drizzle schema.
								await db
									.update(schema.organizationsTable)
									.set({
										plan: newPlan,
										subscriptionId: data.subscription_id,
										subscriptionStatus: data.status || "active",
										customerId: data.customer_id,
										billedSeats: data.quantity,
										productId: productId,
										planUpdatedAt: new Date(),
									})
									.where(eq(schema.organizationsTable.id, organizationId));

								console.log(
									`Updated organization ${organizationId} to plan: ${newPlan}`,
								);
							} else if (cancellationEvents.includes(eventType)) {
								// Downgrade to starter plan
								await db
									.update(schema.organizationsTable)
									.set({
										plan: PLAN_ID.STARTER,
										subscriptionId: data.subscription_id,
										subscriptionStatus: "canceled",
										customerId: data.customer_id,
										planUpdatedAt: new Date(),
									})
									.where(eq(schema.organizationsTable.id, organizationId));

								console.log(
									`Downgraded organization ${organizationId} to Starter plan`,
								);
							}
						} catch (error) {
							console.error("Error processing Dodo Payments webhook:", error);
						}
					},
				}),
				usage(),
			],
		}),
		// lastLoginMethod(),
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
