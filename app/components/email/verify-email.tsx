import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { brand, EmailLayout } from "./email-layout";

interface VerifyEmailProps {
	verifyUrl?: string;
}

export const VerifyEmail = ({ verifyUrl }: VerifyEmailProps) => {
	const previewText = "Welcome to KaamSync - Verify your email";

	return (
		<EmailLayout preview={previewText}>
			<Heading
				style={{ color: brand.foreground }}
				className="text-center font-normal text-2xl"
			>
				Verify your email
			</Heading>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				Welcome to KaamSync! To get started, please verify your email address by
				clicking the button below.
			</Text>
			<Section className="my-8 text-center">
				<Button
					style={{ backgroundColor: brand.primary, color: "#fff" }}
					className="rounded px-10 py-4 text-center font-bold text-sm no-underline"
					href={verifyUrl}
				>
					Verify Email Address
				</Button>
			</Section>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				or copy and paste this URL into your browser:{" "}
				<Link
					href={verifyUrl}
					style={{ color: brand.primary }}
					className="no-underline"
				>
					{verifyUrl}
				</Link>
			</Text>
		</EmailLayout>
	);
};

VerifyEmail.PreviewProps = {
	verifyUrl: "https://kaamsync.com/verify-email/123",
} satisfies VerifyEmailProps;

export default VerifyEmail;
