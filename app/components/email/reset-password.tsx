import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { brand, EmailLayout } from "./email-layout";

interface ResetPasswordEmailProps {
	userName?: string;
	resetUrl: string;
}

export const ResetPasswordEmail = ({
	userName,
	resetUrl,
}: ResetPasswordEmailProps) => {
	const previewText = "Reset your KaamSync password";

	return (
		<EmailLayout preview={previewText}>
			<Heading
				style={{ color: brand.foreground }}
				className="text-center font-normal text-2xl"
			>
				Reset Password
			</Heading>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				{userName ? `Hi ${userName},` : "Hi there,"}
			</Text>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				Someone recently requested a password change for your KaamSync account.
				If this was you, you can set a new password here:
			</Text>
			<Section className="my-8 text-center">
				<Button
					style={{ backgroundColor: brand.primary, color: "#fff" }}
					className="rounded px-10 py-4 text-center font-bold text-sm no-underline"
					href={resetUrl}
				>
					Reset Password
				</Button>
			</Section>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				or copy and paste this URL into your browser:{" "}
				<Link
					href={resetUrl}
					style={{ color: brand.primary }}
					className="no-underline"
				>
					{resetUrl}
				</Link>
			</Text>
			<Text style={{ color: brand.muted }} className="mt-5 text-sm leading-6">
				If you don't want to change your password or didn't request this, just
				ignore and delete this message.
			</Text>
		</EmailLayout>
	);
};

ResetPasswordEmail.PreviewProps = {
	userName: "Alan Turing",
	resetUrl: "https://kaamsync.com/reset-password/token",
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
