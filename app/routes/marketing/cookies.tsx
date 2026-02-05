import type { MetaFunction } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { marketingMeta } from "~/lib/seo/marketing-meta";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync | Cookie Policy",
		description: "How we use cookies and local storage to keep you synced.",
		path: "/cookies",
	});

export default function CookiesPage() {
	return (
		<>
			<MarketingContainer variant="hero" className="border-border/40 border-b">
				<div className="mx-auto max-w-3xl text-center">
					<MarketingBadge>Cookies</MarketingBadge>
					<MarketingHeading as="h2">
						Cookie Policy
						<br />
						<span className="italic">How we stay connected.</span>
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
						<h3 className="font-bold font-serif text-3xl">
							1. What are Cookies?
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							Cookies are small text files stored on your device. We also use
							technologies like <strong>Local Storage</strong> and{" "}
							<strong>IndexedDB</strong> to enable the offline capabilities that
							make KaamSync unique.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							2. How We Use Them
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							We use these technologies for the following purposes:
						</p>
						<ul className="mt-4 list-disc space-y-4 pl-6 text-muted-foreground">
							<li>
								<strong>Authentication (Essential):</strong> We use cookies to
								keep you logged in across sessions. These are critical for
								security and access.
							</li>
							<li>
								<strong>Offline Sync (Essential):</strong> We use your browser's
								IndexedDB to store your organization's data locally. This allows
								you to view and edit Matters without an internet connection.
							</li>
							<li>
								<strong>Preferences:</strong> We use local storage to remember
								your theme (Light/Dark mode) and sidebar preferences.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							3. Managing Your Choices
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							You can clear your browser's cookies and local data at any time
							through your browser settings. However, please note that clearing
							this data will log you out and remove any unsynchronized offline
							changes.
						</p>
					</section>
				</div>
			</MarketingContainer>
		</>
	);
}
