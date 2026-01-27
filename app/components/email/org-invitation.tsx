import { Button, Heading, Section, Text } from "@react-email/components";
import { brand, EmailLayout } from "./email-layout";

interface OrgInvitationEmailProps {
	organizationName: string;
	inviterName: string;
	inviterEmail: string;
	inviteLink: string;
}

export const OrgInvitationEmail = ({
	organizationName,
	inviterName,
	inviterEmail,
	inviteLink,
}: OrgInvitationEmailProps) => {
	const previewText = `Join ${organizationName} on KaamSync`;

	return (
		<EmailLayout preview={previewText}>
			<Heading
				style={{ color: brand.foreground }}
				className="text-center font-normal text-2xl"
			>
				Join <strong>{organizationName}</strong>
			</Heading>
			<Text style={{ color: brand.foreground }} className="text-sm leading-6">
				<strong>{inviterName}</strong> ({inviterEmail}) has invited you to join
				the <strong>{organizationName}</strong> team on KaamSync.
			</Text>
			<Section className="my-8 text-center">
				<Button
					style={{ backgroundColor: brand.primary, color: "#fff" }}
					className="rounded px-10 py-4 text-center font-bold text-sm no-underline"
					href={inviteLink}
				>
					Accept Invitation
				</Button>
			</Section>
			<Text style={{ color: brand.muted }} className="text-sm leading-6">
				If you were not expecting this invitation, you can safely ignore this
				email.
			</Text>
		</EmailLayout>
	);
};

OrgInvitationEmail.PreviewProps = {
	organizationName: "KaamSync",
	inviterName: "John Doe",
	inviterEmail: "john@kaamsync.com",
	inviteLink: "https://kaamsync.com/invite/123",
} satisfies OrgInvitationEmailProps;

export default OrgInvitationEmail;
