import { UseSend } from "usesend-js";
import { OrgInvitationEmail } from "~/components/email/org-invitation";
import { VerifyEmail } from "~/components/email/verify-email";
import { normalizeError } from "~/lib/error-utils";
import { trackMembershipChange } from "~/lib/server/billing-tracking.server";
import { env, isDevelopment } from "~/lib/server/env-validation.server";

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

		try {
			await usesend.emails.send({
				from: "support@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Reset your password",
				html: `<p>Click the link to reset your password: <a href="${url}">${url}</a></p>`,
			});
		} catch (err) {
			console.error(
				"[AuthService] Failed to send reset password email",
				{ email: user.email, url },
				err,
			);
			throw normalizeError(err);
		}
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

		try {
			await usesend.emails.send({
				from: "welcome@mail.kaamsync.com",
				to: user.email,
				subject: "KaamSync: Verify your email address",
				react: <VerifyEmail verifyUrl={url} />,
			});
		} catch (err) {
			console.error(
				"[AuthService] Failed to send verification email",
				{ email: user.email, url },
				err,
			);
			throw normalizeError(err);
		}
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

		await usesend.emails.send({
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
		});
	},

	async handleMembershipChange(organizationId: string) {
		// Use unified tracking function (handles cache invalidation + billing)
		try {
			await trackMembershipChange(organizationId);
		} catch (err) {
			console.error("[Billing] Failed to track membership change:", err);
		}
	},
};
