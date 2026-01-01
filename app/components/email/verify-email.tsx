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

interface VerifyEmailProps {
	verifyUrl?: string;
}

const baseUrl = process.env.SITE_URL ? `https://${process.env.SITE_URL}` : "";

export const VerifyEmail = ({ verifyUrl }: VerifyEmailProps) => (
	<Html>
		<Head />
		<Tailwind>
			<Body className="bg-white font-linear">
				<Preview>Welcome to KaamSync</Preview>

				<Container className="mx-auto my-0 max-w-2xl px-0 pt-5 pb-12">
					<Img
						src={`${baseUrl}/static/kaamsync-logo.svg`}
						width="42"
						height="42"
						alt="KaamSync"
						className="h-12 w-12 rounded-full bg-[#242424ca] p-1"
					/>
					<Heading className="px-0 pt-10 pb-0 font-normal text-[#484848] text-[24px] leading-[1.3] tracking-[-0.5px]">
						Welcome to KaamSync
					</Heading>

					<Section className="px-0 py-6">
						<Button
							className="block rounded bg-[#292cf5ca] px-6 py-4 text-center font-semibold text-[15px] text-white no-underline"
							href={verifyUrl}
						>
							Login to KaamSync
						</Button>
					</Section>

					<Text className="text-[#3c4149] text-[15px] leading-[1.4]">
						This link will only be valid for the next 60 minutes. If the link
						does not work, please copy and paste the following URL into your
						browser:
					</Text>
					<Text className="break-all text-[#3c4149] text-[15px] leading-[1.4]">
						{verifyUrl}
					</Text>

					<Hr className="border-[#dfe1e4] py-6" />
					<Link
						href="https://kaamsync.com"
						className="text-[#b4becc] text-[14px]"
					>
						KaamSync
					</Link>
				</Container>
			</Body>
		</Tailwind>
	</Html>
);
