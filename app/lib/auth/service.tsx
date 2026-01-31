/**
 * @file Authentication service for email notifications and side effects
 * @description Handles sending authentication-related emails (password reset, verification,
 * invitations) and triggers billing/audit events during auth operations.
 * Uses UseSend for email delivery with fallback logging in development.
 *
 * Key exports:
 * - AuthService.sendResetPasswordEmail() - Password reset link email
 * - AuthService.sendVerificationEmail() - Email verification with React component
 * - AuthService.sendInvitationEmail() - Organization invitation with details
 *
 * @see app/lib/server/env-validation.server.ts for email configuration
 * @see app/components/email/ for email component templates
 */

import { UseSend } from "usesend-js";
import OrgInvitationEmail from "~/components/email/org-invitation";
import ResetPasswordEmail from "~/components/email/reset-password";
import VerifyEmail from "~/components/email/verify-email";
import { env, isDevelopment } from "~/lib/infra/env";
import { normalizeError } from "~/lib/utils/error";

const usesend = new UseSend(env.USESEND_API_KEY, env.USESEND_SELF_HOSTED_URL);

/**
 * Service to handle authentication-related side effects
 * such as sending emails and tracking billing events.
 */
export const AuthService = {
	async sendResetPasswordEmail({
		user,
		url,
	}: {
		user: { email: string };
		url: string;
	}) {
		if (isDevelopment) {
			console.log("Reset password link:", url);
			return;
		}

		await usesend.emails
			.send({
				from: "support@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Reset your password",
				react: <ResetPasswordEmail resetUrl={url} userName={user.email} />,
			})
			.catch((err) => {
				throw normalizeError(err);
			});
	},

	async sendVerificationEmail({
		user,
		url,
	}: {
		user: { email: string };
		url: string;
	}) {
		if (isDevelopment) {
			console.log("Email verification link:", url);
			return;
		}

		await usesend.emails
			.send({
				from: "welcome@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Verify your email address",
				react: <VerifyEmail verifyUrl={url} />,
			})
			.catch((err) => {
				throw normalizeError(err);
			});
	},

	async sendInvitationEmail({
		email,
		organization,
		inviter,
	}: {
		email: string;
		organization: { name: string };
		inviter: { user: { email: string; name: string } };
	}) {
		const inviteLink = `${env.SITE_URL}/join`;

		if (isDevelopment) {
			console.log(
				`Invitation email to ${email}: ${inviteLink} (organization: ${organization.name}, invited by: ${inviter.user.email})`,
			);
			return;
		}

		await usesend.emails
			.send({
				from: "KaamSync@mail.kaamsync.com",
				to: email,
				subject: `You're invited to join ${organization.name} on KaamSync`,
				react: (
					<OrgInvitationEmail
						organizationName={organization.name}
						inviterName={inviter.user.name}
						inviterEmail={inviter.user.email}
						inviteLink={inviteLink}
					/>
				),
			})
			.catch((err) => {
				throw normalizeError(err);
			});
	},
};
