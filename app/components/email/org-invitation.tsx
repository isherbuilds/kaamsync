import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { baseUrl } from "./verify-email";

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
}: OrgInvitationEmailProps) => (
	<Html>
		<Head />
		<Tailwind>
			<Body className="bg-white font-sans">
				<Preview>Join {organizationName} on KaamSync</Preview>

				<Container className="mx-auto my-0 max-w-2xl px-0 pt-5 pb-12">
					<Img
						src={`${baseUrl}/static/kaamsync-logo.png`}
						width="48"
						height="48"
						alt="KaamSync"
						className="h-12 w-12 bg-[#000] p-1"
					/>
					<Heading className="px-0 pt-10 pb-0 font-normal text-[#484848] text-[24px] leading-[1.3] tracking-[-0.5px]">
						Join <strong>{organizationName}</strong> on KaamSync
					</Heading>

					<Section className="px-0 py-6">
						<Text className="text-[#3c4149] text-[15px] leading-[1.4]">
							<strong>{inviterName}</strong> ({inviterEmail}) has invited you to
							join the <strong>{organizationName}</strong> organization on
							KaamSync.
						</Text>
						<Button
							className="block rounded bg-[#e53300] px-6 py-4 text-center font-semibold text-[15px] text-white no-underline"
							href={inviteLink}
						>
							Join Team
						</Button>
					</Section>

					<Text className="text-[#3c4149] text-[15px] leading-[1.4]">
						If you weren't expecting this invitation, you can safely ignore this
						email.
					</Text>

					<Hr className="border-[#dfe1e4] py-6" />
					<Link href={baseUrl} className="text-[#b4becc] text-[14px]">
						KaamSync
					</Link>
				</Container>
			</Body>
		</Tailwind>
	</Html>
);
