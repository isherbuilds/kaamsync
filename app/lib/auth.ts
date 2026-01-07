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
import { UseSend } from "usesend-js";
import { OrgInvitationEmail } from "~/components/email/org-invitation";
import { VerifyEmail } from "~/components/email/verify-email";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { billingConfig, dodoPayments } from "~/lib/billing";
import { handleBillingWebhook } from "~/lib/server/billing.server";
import {
	trackMemberRemoved,
	trackNewMember,
} from "~/lib/server/billing-tracking.server";
import { getActiveOrganization } from "~/lib/server/organization.server";

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
		...(process.env.GOOGLE_CLIENT_ID &&
			process.env.GOOGLE_CLIENT_SECRET && {
				google: {
					clientId: process.env.GOOGLE_CLIENT_ID,
					clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				},
			}),
	},
	session: {
		modelName: "sessionsTable",
		expiresIn: 60 * 60 * 24 * 365, // 1 year
		updateAge: 60 * 60 * 24 * 365, // 1 year
		disableSessionRefresh: true,
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
			organizationHooks: {
				afterAcceptInvitation: async ({ member }) => {
					// console.log(
					// 	`[AuthHook] afterAcceptInvitation: org=${member.organizationId}`,
					// );
					if (member.organizationId) {
						// Delegate tracking to afterAddMember to prevent double events
						trackNewMember(member.organizationId).catch((err) =>
							console.error("[Billing] Failed to track member addition:", err),
						);
					}
				},
				afterAddMember: async ({ member }) => {
					// console.log(
					// 	`[AuthHook] afterAddMember: org=${member.organizationId}`,
					// );
					if (member.organizationId) {
						trackNewMember(member.organizationId).catch((err) =>
							console.error("[Billing] Failed to track member addition:", err),
						);
					}
				},
				afterRemoveMember: async ({ member }) => {
					if (member.organizationId) {
						trackMemberRemoved(member.organizationId).catch((err) =>
							console.error("[Billing] Failed to track member removal:", err),
						);
					}
				},
			},
		}),
		// lastLoginMethod(),
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
									...(process.env.DODO_PRODUCT_GROWTH_MONTHLY
										? [
												{
													productId: process.env.DODO_PRODUCT_GROWTH_MONTHLY,
													slug: "growth-monthly",
												},
											]
										: []),
									...(process.env.DODO_PRODUCT_GROWTH_YEARLY
										? [
												{
													productId: process.env.DODO_PRODUCT_GROWTH_YEARLY,
													slug: "growth-yearly",
												},
											]
										: []),
									// Pro plans (monthly & yearly)
									...(process.env.DODO_PRODUCT_PROFESSIONAL_MONTHLY
										? [
												{
													productId:
														process.env.DODO_PRODUCT_PROFESSIONAL_MONTHLY,
													slug: "pro-monthly",
												},
											]
										: []),
									...(process.env.DODO_PRODUCT_PROFESSIONAL_YEARLY
										? [
												{
													productId:
														process.env.DODO_PRODUCT_PROFESSIONAL_YEARLY,
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
								onPayload: async (payload) => {
									const maxRetries = 3;
									let lastError: Error | null = null;

									for (let attempt = 0; attempt < maxRetries; attempt++) {
										try {
											await handleBillingWebhook({
												business_id: payload.business_id,
												type: payload.type,
												timestamp: payload.timestamp,
												data: payload.data as unknown as Parameters<
													typeof handleBillingWebhook
												>[0]["data"],
											});
											return; // Success - exit retry loop
										} catch (error) {
											lastError =
												error instanceof Error
													? error
													: new Error(String(error));

											if (attempt < maxRetries - 1) {
												// Exponential backoff: 1s, 2s, 4s
												const delay = 1000 * 2 ** attempt;
												console.warn(
													`[Billing] Webhook attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
													lastError.message,
												);
												await new Promise((resolve) =>
													setTimeout(resolve, delay),
												);
											}
										}
									}

									// All retries exhausted
									console.error(
										`[Billing] Webhook failed after ${maxRetries} attempts:`,
										lastError,
									);
									// Re-throw to signal failure to Better Auth
									throw lastError;
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
