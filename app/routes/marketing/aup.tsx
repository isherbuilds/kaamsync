import type { MetaFunction } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { marketingMeta } from "~/lib/seo/marketing-meta";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync | Acceptable Use Policy",
		description: "How to use KaamSync responsibly and professionally.",
		path: "/aup",
	});

export default function AupPage() {
	return (
		<>
			<MarketingContainer variant="hero" className="border-border/40 border-b">
				<div className="mx-auto max-w-3xl text-center">
					<MarketingBadge>Conduct</MarketingBadge>
					<MarketingHeading as="h2">
						Acceptable Use Policy
						<br />
						<span className="italic">Keeping work professional and safe.</span>
					</MarketingHeading>
					<p className="mx-auto max-w-xl text-lg text-muted-foreground">
						Last Updated: February 4, 2026
					</p>
				</div>
			</MarketingContainer>

			<MarketingContainer
				variant="default"
				className="prose prose-neutral dark:prose-invert mx-auto max-w-4xl"
			>
				<div className="space-y-12">
					<section>
						<h3 className="font-bold font-serif text-3xl">1. Purpose</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							This Acceptable Use Policy ("AUP") outlines the standards of
							conduct for all users of KaamSync. We built this tool to bring
							calm to operations, and we expect all users to contribute to a
							professional environment.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							2. Prohibited Content
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							You may not upload, share, or process content that:
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>Is illegal or promotes illegal activities.</li>
							<li>Is defamatory, obscene, harassing, or threatening.</li>
							<li>Infringes on the intellectual property rights of others.</li>
							<li>Contains viruses, malware, or other malicious code.</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							3. Prohibited Actions
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							While using the Service, you agree not to:
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								Attempt to bypass security measures or access data belonging to
								other Organizations.
							</li>
							<li>
								Reverse engineer any part of the Service or its sync protocols.
							</li>
							<li>
								Use automated systems (bots, scrapers) to extract data from the
								Service without prior written consent.
							</li>
							<li>
								Abuse the Request/Approval system to spam or harass team
								members.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">4. Enforcement</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							KaamSync reserves the right to suspend or terminate access to any
							user or Organization found to be in violation of this AUP. We may
							also remove content that we deem, in our sole discretion, to be in
							violation of these standards.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							5. Reporting Violations
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							If you become aware of a violation of this policy, please report
							it to your Organization's administrator or contact us directly at{" "}
							<a
								href="mailto:hello@kaamsync.com"
								className="font-bold text-primary"
							>
								hello@kaamsync.com
							</a>
							.
						</p>
					</section>
				</div>
			</MarketingContainer>
		</>
	);
}
