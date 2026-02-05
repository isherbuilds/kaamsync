import type { MetaFunction } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { marketingMeta } from "~/lib/seo/marketing-meta";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync | Terms of Service",
		description: "The rules of the game for using KaamSync.",
		path: "/terms",
	});

export default function TermsPage() {
	return (
		<>
			<MarketingContainer variant="hero" className="border-border/40 border-b">
				<div className="mx-auto max-w-3xl text-center">
					<MarketingBadge>Legal</MarketingBadge>
					<MarketingHeading as="h2">
						Terms of Service
						<br />
						<span className="italic">Clear rules for clear work.</span>
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
							1. Agreement to Terms
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							By accessing or using KaamSync, you agree to be bound by these
							Terms of Service. If you sign up for an account, complete an
							order, or click an acceptance box referencing these Terms, you
							agree to be bound by them. If you are using KaamSync on behalf of
							an organization, you agree to these terms for that organization
							and represent that you have the authority to bind that
							organization to these terms.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">2. The Service</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							KaamSync provides an offline-first task management and
							coordination platform. Core features include:
						</p>
						<ul className="list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								<strong>Matters:</strong> Units of work identified by a Team
								Code and Short ID.
							</li>
							<li>
								<strong>Requests & Approvals:</strong> A structured workflow for
								seeking and granting operational permissions.
							</li>
							<li>
								<strong>Offline Sync:</strong> The ability to capture data
								without an internet connection and synchronize it later.
							</li>
						</ul>
					</section>

					<section className="border-primary border-l-4 bg-muted/30 p-8">
						<h3 className="font-bold font-serif text-2xl">
							3. Offline Operations & Data Sync
						</h3>
						<p className="mt-4 text-lg text-muted-foreground leading-relaxed">
							KaamSync is built to work offline. However, synchronization
							requires an internet connection.
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								<strong>Conflict Resolution:</strong> In the event of
								conflicting updates to a Matter or Request, the system's
								"last-write-wins" or deterministic sync logic will apply.
								KaamSync is not liable for data loss resulting from these
								conflict resolutions.
							</li>
							<li>
								<strong>Data Integrity:</strong> Users are responsible for
								ensuring their devices connect to the internet regularly to sync
								local data to the primary servers. We are not responsible for
								data that is lost on a device before it has successfully
								synchronized.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							4. Subscriptions & Billing
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							Billing is processed through <strong>DodoPayments</strong>.
						</p>
						<ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
							<li>
								<strong>Tiers:</strong> We offer Starter (Free), Growth, and
								Professional tiers. Each tier has specific limits on members,
								matters, and storage as defined on our Pricing page.
							</li>
							<li>
								<strong>Organization Responsibility:</strong> The Organization
								is responsible for all fees incurred. Failure to pay may result
								in your Organization being "frozen," limiting your ability to
								add members or create new Matters.
							</li>
							<li>
								<strong>Cancellations:</strong> You may cancel via the billing
								portal at any time. Cancellations typically take effect at the
								end of the current billing cycle.
							</li>
						</ul>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							5. Content & Ownership
						</h3>
						<p className="text-lg text-muted-foreground leading-relaxed">
							The Organization owns all data, files, and "Matters" created
							within its workspace. KaamSync acts as a service provider and
							processor. You represent that you have all necessary rights to
							upload and process the content you input into the Service.
						</p>
					</section>

					<section>
						<h3 className="font-bold font-serif text-3xl">
							6. Limitation of Liability
						</h3>
						<p className="text-lg text-muted-foreground italic leading-relaxed">
							TO THE MAXIMUM EXTENT PERMITTED BY LAW, KAAMSYNC SHALL NOT BE
							LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR
							PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
							INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
							GOOD-WILL, OR OTHER INTANGIBLE LOSSES.
						</p>
					</section>
				</div>
			</MarketingContainer>
		</>
	);
}
