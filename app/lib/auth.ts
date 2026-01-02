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
import DodoPayments from "dodopayments";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { UseSend } from "usesend-js";
import { OrgInvitationEmail } from "~/components/email/org-invitation";
import { VerifyEmail } from "~/components/email/verify-email";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { DODO_PRODUCT_IDS, PLAN_ID, type PlanId } from "~/lib/pricing";
import { getActiveOrganization } from "~/lib/server/organization.server";

export const dodoPayments = new DodoPayments({
	bearerToken: process.env.DODO_PAYMENTS_API_KEY ?? "",
	environment:
		process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

const usesend = new UseSend(
	process.env.USESEND_API_KEY,
	process.env.USESEND_SELF_HOSTED_URL,
);

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
		requireEmailVerification: process.env.NODE_ENV === "production",
		sendResetPassword: async ({ user, url }) => {
			if (process.env.NODE_ENV === "development") {
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
			if (process.env.NODE_ENV === "development") {
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
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
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
					const orgId = invitation.organizationId;
					const org = await db.query.organizationsTable.findFirst({
						where: eq(schema.organizationsTable.id, orgId),
					});

					if (!org) return;

					const planId = (org.plan as PlanId) || PLAN_ID.STARTER;
					const { limits } = await import("~/lib/pricing").then((m) => ({
						limits: m.getPlanLimits(planId),
					}));

					if (limits.maxMembers !== null) {
						// Only count non-guest members for plan limits
						const existingPaidMembers = await db
							.select()
							.from(schema.membersTable)
							.where(eq(schema.membersTable.organizationId, orgId));

						// In Starter/Pro, all members typically count unless we strictly define Guests as free there too.
						// User said "business users free users" -> likely Business plan.
						// For Starter/Pro (flat limits), we exclude 'guest' from the count if they exist.
						const paidCount = existingPaidMembers.filter(
							(m) => m.role !== "guest",
						).length;

						if (paidCount >= limits.maxMembers) {
							throw new Error(
								`Organization has reached the member limit (${limits.maxMembers}) for the ${org.plan} plan. Upgrade to add more members.`,
							);
						}
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
					if (member.role === "guest") return { data: member };

					const org = await db.query.organizationsTable.findFirst({
						where: eq(schema.organizationsTable.id, orgId),
					});

					if (!org) return;

					const planId = (org.plan as PlanId) || PLAN_ID.STARTER;
					const { limits } = await import("~/lib/pricing").then((m) => ({
						limits: m.getPlanLimits(planId),
					}));

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
								`Organization has reached the member limit (${limits.maxMembers}) for the ${org.plan} plan.`,
							);
						}
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
			// NOTE: We don't use Better Auth's built-in teams feature.
			// KaamSync has its own rich teams system in teamsTable/teamMembershipsTable
			// with custom fields (code, nextShortId, visibility, granular permissions).
			// The teams feature here is disabled to avoid creating unused tables.
			teams: {
				enabled: false,
			},
			// Member limits are enforced dynamically in our custom team system
			// via Zero mutators (see zero/plan-limits.ts).
			// Better Auth's membershipLimit only accepts a static number, so we set
			// a high default and rely on our mutator-level checks for plan enforcement.
			membershipLimit: 10000,
			async sendInvitationEmail({ email, organization, inviter }) {
				const inviteLink = `${process.env.SITE_URL}/join`;

				if (process.env.NODE_ENV === "development") {
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
						// Business Plan - $9/user/month (seat-based)
						{
							productId: DODO_PRODUCT_IDS.BUSINESS_MONTHLY,
							slug: "business_monthly",
						},
						{
							productId: DODO_PRODUCT_IDS.BUSINESS_YEARLY,
							slug: "business_yearly",
						},
					],
					successUrl: "/organization/settings/billing?success=true",
					authenticatedUsersOnly: true,
				}),
				portal(),
				webhooks({
					webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? "",
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
								// Update organization using proper schema columns
								await db
									.update(schema.organizationsTable)
									.set({
										plan: newPlan,
										subscriptionId: data.subscription_id,
										subscriptionStatus: data.status || "active",
										customerId: data.customer_id,
										billedSeats: data.quantity,
										planUpdatedAt: new Date(),
									})
									.where(eq(schema.organizationsTable.id, organizationId));

								console.log(
									`Updated organization ${organizationId} to plan: ${newPlan}`,
								);
							} else if (cancellationEvents.includes(eventType)) {
								// Downgrade to starter plan on cancellation/refund
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
