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
import { trackMembershipChange } from "~/lib/server/billing-tracking.server";
import {
	env,
	isDevelopment,
	isProduction,
} from "~/lib/server/env-validation.server";
import { getActiveOrganization } from "~/lib/server/organization.server";

const usesend = new UseSend(env.USESEND_API_KEY, env.USESEND_SELF_HOSTED_URL);

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
	rateLimit: {
		enabled: true,
		window: 60, // 60 seconds
		max: 100, // 100 requests per window
		customRules: {
			"/api/zero/*": { window: 60, max: 10 },
			"/api/auth/*": { window: 60, max: 10 },
			"/api/auth/sign-in/*": { window: 60, max: 10 },
			"/api/auth/sign-up/*": { window: 60, max: 5 },
			"/api/auth/forgot-password": { window: 60, max: 3 },
			"/api/auth/dodopayments/checkout/*": { window: 60, max: 5 },
			"/api/billing/*": { window: 60, max: 5 },
			"/api/notifications/*": { window: 60, max: 5 },
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
		sendResetPassword: async ({ user, url }) => {
			if (isDevelopment) {
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
			if (isDevelopment) {
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

			async sendInvitationEmail({ email, organization, inviter }) {
				const inviteLink = `${env.SITE_URL}/join`;

				if (isDevelopment) {
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
					if (member.organizationId) {
						// Use unified tracking function (handles cache invalidation + billing)
						trackMembershipChange(member.organizationId).catch((err) =>
							console.error(
								"[Billing] Failed to track membership change:",
								err,
							),
						);
					}
				},
				afterAddMember: async ({ member }) => {
					if (member.organizationId) {
						// Use unified tracking function (handles cache invalidation + billing)
						trackMembershipChange(member.organizationId).catch((err) =>
							console.error(
								"[Billing] Failed to track membership change:",
								err,
							),
						);
					}
				},
				afterRemoveMember: async ({ member }) => {
					if (member.organizationId) {
						// Use unified tracking function (handles cache invalidation + billing)
						trackMembershipChange(member.organizationId).catch((err) =>
							console.error(
								"[Billing] Failed to track membership change:",
								err,
							),
						);
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
