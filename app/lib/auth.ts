import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { cache } from "react";
import { UseSend } from "usesend-js";
import { VerifyEmail } from "~/components/email/verify-email";
import { OrgInvitationEmail } from "~/components/email/org-invitation";
import { db } from "~/db";
import * as schema from "~/db/schema";
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
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
			async sendInvitationEmail({
				email,
				organization,
				inviter,
				role,
				invitation				,
			}) {

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
