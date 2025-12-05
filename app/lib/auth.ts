import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { cache } from "react";
import { db } from "~/db";
import * as schema from "~/db/schema";
import { getActiveOrganization } from "~/lib/server/organization.server";

export const auth = betterAuth({
	experimental: {
		joins: true,
	},
	appName: "kaamsync",
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		sendResetPassword: async ({ user, url }) => {
			//   await resend.emails.send({
			//     from: "support@mail.kanbased.com",
			//     to: user.email,
			//     subject: "Reset your password",
			//     html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
			//   });
		},
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			//   await resend.emails.send({
			//     from: "support@mail.kanbased.com",
			//     to: user.email,
			//     subject: "Verify your email address",
			//     html: `<p>Click the link to verify your email: <a href="${url}">${url}</a></p>`,
			//   });
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
			async sendInvitationEmail(data) {
				// const inviteLink = `${env.FE_ORIGIN}/accept-invitation/${data.id}`;
				// await sendOrganizationInvitation({
				// 	email: data.email,
				// 	invitedByUsername: data.inviter.user.name,
				// 	invitedByEmail: data.inviter.user.email,
				// 	teamName: data.organization.name,
				// 	inviteLink,
				// });
			},
		}),
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
