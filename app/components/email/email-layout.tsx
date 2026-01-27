import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	pixelBasedPreset,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import type * as React from "react";
import { baseUrl } from "./constants";

interface EmailLayoutProps {
	preview: string;
	children: React.ReactNode;
}

export const brand = {
	primary: "#e53300",
	background: "#fafafa",
	foreground: "#242424",
	muted: "#737373",
	border: "#d4d4d4",
};

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => {
	return (
		<Html>
			<Head />
			<Tailwind
				config={{
					presets: [pixelBasedPreset],
				}}
			>
				<Body
					style={{ backgroundColor: brand.background, color: brand.foreground }}
					className="mx-auto my-auto px-2 font-sans"
				>
					<Preview>{preview}</Preview>
					<Container
						style={{ borderColor: brand.border }}
						className="mx-auto my-10 max-w-[465px] rounded-md border border-solid bg-white p-5"
					>
						<Section className="mt-5">
							<Img
								src={`${baseUrl}/static/kaamsync-logo.png`}
								width="40"
								height="40"
								alt="KaamSync"
								className="mx-auto my-0 rounded-sm bg-black p-1"
							/>
						</Section>

						<Section className="my-6">{children}</Section>

						<Hr
							style={{ borderColor: brand.border }}
							className="mx-0 my-6.5 w-full border-solid"
						/>

						<Text
							style={{ color: brand.muted }}
							className="text-center text-xs leading-6"
						>
							KaamSync - The operating system for field teams.
						</Text>

						<div className="text-center">
							<Link
								href={baseUrl}
								style={{ color: brand.muted }}
								className="text-xs no-underline hover:text-foreground"
							>
								Visit Website
							</Link>
						</div>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default EmailLayout;
