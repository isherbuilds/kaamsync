import type { MetaFunction } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { marketingMeta } from "~/lib/seo/marketing-meta";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync | Privacy Policy",
		description: "How we protect and manage your data.",
		path: "/privacy",
	});

export default function PrivacyPage() {
	return (
		<>
			<MarketingContainer variant="hero" className="border-border/40 border-b">
				<div className="mx-auto max-w-3xl text-center">
					<MarketingBadge>Privacy</MarketingBadge>
					<MarketingHeading as="h2">
						Privacy Policy
						<br />
						<span className="italic">Trust is built on transparency.</span>
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
						<h3 className="font-bold font-serif text-3xl">1. Introduction</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							KaamSync is a productivity tool for field teams. This policy
							explains how we collect, use, and protect your data. When you use
							KaamSync, your Organization is the primary{" "}
							<strong>Data Controller</strong>, and we are the{" "}
							<strong>Data Processor</strong>.
						</p>
						<p className="text-lg text-muted-foreground leading-relaxed">
							By using or accessing KaamSync in any manner (including signing up
							for an account), you acknowledge that you accept this Privacy
							Policy and consent to the collection, use, and sharing of your
							information as described herein. For privacy questions contact us
							at{" "}
							<a
								href="mailto:hello@kaamsync.com"
								className="font-bold text-primary"
							>
								hello@kaamsync.com
							</a>
							.
						</p>
						<p className="text-lg text-muted-foreground leading-relaxed">
							We retain Personal Data for as long as you have an active account
							or as necessary to provide the Service, comply with legal
							obligations, and resolve disputes. See the sections below for more
							details on retention, your rights, and how to manage cookies via
							our{" "}
							<a href="/cookies" className="font-bold text-primary">
								Cookie Policy
							</a>
							.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							2. Data We Collect
						</h3>
						<ul className="list-disc space-y-4 pl-6 text-muted-foreground">
							<li>
								<strong>Account Information:</strong> Name, email address, and
								profile photo provided via signup or Google OAuth.
							</li>
							<li>
								<strong>Operational Data:</strong> Tasks, requests, "Matters",
								comments, and attachments (photos/documents) uploaded to your
								workspace.
							</li>
							<li>
								<strong>Device & Offline Data:</strong> We store data locally on
								your device to support offline work. This data is transmitted to
								our servers once an internet connection is established.
							</li>
							<li>
								<strong>Usage Metadata:</strong> We track when Matters are
								viewed and activity timelines to provide coordination features
								to your team.
							</li>
						</ul>
					</section>

			<section className="border-destructive border-l-4 bg-muted/20 p-8">
						<h3 className="font-bold font-serif text-2xl">
							3. Workplace Monitoring Disclosure
						</h3>
						<p className="mt-4 text-lg text-muted-foreground leading-relaxed">
							To help teams coordinate effectively, KaamSync includes features
							that track activity:
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								Managers and Admins in your Organization can see when you last
								viewed a specific Matter.
							</li>
							<li>
								Activity timelines log status changes, comments, and approvals
								associated with your account.
							</li>
							<li>
								This information is visible to other authorized members of your
								Team and Organization.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							4. How We Use Data
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							We use your data strictly to provide the Service, including:
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>Synchronizing work items across your team's devices.</li>
							<li>
								Sending push notifications for approvals and task updates.
							</li>
							<li>Processing payments via DodoPayments.</li>
							<li>Sending system emails and invitations via UseSend.</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							5. Third-Party Subprocessors
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							We use the following trusted partners to help run KaamSync:
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								<strong>Zero (Rocicorp):</strong> Real-time data
								synchronization.
							</li>
							<li>
								<strong>Google:</strong> Authentication and OAuth services.
							</li>
							<li>
								<strong>DodoPayments:</strong> Payment processing and
								subscription management.
							</li>
							<li>
								<strong>UseSend:</strong> Transactional and notification emails.
							</li>
							<li>
								<strong>Cloud Storage Providers:</strong> Secure S3-compatible
								storage for your attachments.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">6. Your Rights</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							Depending on your location, you may have rights to access,
							correct, or delete your personal data. Because KaamSync is an
							organizational tool, please direct most data requests to your
							Organization's administrator first.
						</p>
					</section>
				</div>
			</MarketingContainer>
		</>
	);
}
