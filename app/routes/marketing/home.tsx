import { ArrowRight, ChevronRight } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { ChatSimulator } from "~/components/marketing/chat-simulator";
import { DashboardPreview } from "~/components/marketing/dashboard-preview";
import { FAQ } from "~/components/marketing/faq";
import { FeaturesGrid } from "~/components/marketing/features-grid";
import {
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
	{ title: "KaamSync - Stop Managing Work in WhatsApp" },
	{
		name: "description",
		content:
			"Stop drowning in chat groups. KaamSync helps field teams manage tasks, approvals, and operations in one simple, offline-first app.",
	},
];

const FAQS = [
	{
		q: "How fast can we get started?",
		a: "Setup takes less than 2 minutes. You can create your organization, invite up to 3 team members for free, and start tracking Matters immediately.",
	},
	{
		q: "Does it really work offline?",
		a: "Yes. Our Zero-sync architecture ensures that your team can open the app, log work, and take photos without any internet connection. Everything syncs automatically once they're back online.",
	},
	{
		q: "Can we migrate from WhatsApp / Slack?",
		a: "While there's no 'import' from chat, most teams find that starting fresh with structured flows in KaamSync immediately clears up the chaos. You can keep WhatsApp for social chatter and KaamSync for work.",
	},
	{
		q: "Is my data secure?",
		a: "Absolutely. Everything in KaamSync is designed to keep your work safe and secure. We force HTTPS for all connections and encrypt data in-transit with TLS 1.2+. For storage, we rely on best-in-class infrastructure partners who utilize industry-standard physical disk encryption to safeguard your data at rest.",
	},
];

export default function HomePage() {
	return (
		<div className="flex flex-col bg-background text-foreground">
			{/* HERO SECTION */}
			<section className="relative flex flex-col items-center justify-center border-border/40 border-b pt-24 pb-32">
				<div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />

				<div className="container relative z-10 px-4 text-center md:px-6">
					<MarketingHeading as="h1" className="mx-auto mb-8 max-w-5xl">
						Turn conversations into <br />
						<span className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
							clear, trackable work.
						</span>
					</MarketingHeading>

					<p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl">
						KaamSync helps operations teams track jobs, approvals, and updates
						in one calm workspace — even when teams are offline.
					</p>

					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button
							size="lg"
							className="h-14 w-full rounded-none bg-foreground px-8 font-medium text-background text-lg shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] shadow-primary transition-all hover:bg-foreground hover:shadow-none md:max-w-2xs"
							asChild
						>
							<Link to="/signup">
								Get Started <ArrowRight className="size-5" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="link"
							className="h-14 px-8 font-medium text-foreground text-lg hover:bg-muted"
							asChild
						>
							<Link to="/contact">Talk to Us</Link>
						</Button>
					</div>

					<p className="mt-6 font-mono text-muted-foreground text-xs uppercase tracking-wide">
						No Credit Card Required • Setup in 2 Minutes
					</p>
				</div>
			</section>

			{/* VISUALIZATION: The Blueprint */}
			<section className="container relative z-20 mx-auto -mt-20 px-4 md:px-6">
				<DashboardPreview />
			</section>

			{/* PROBLEM SECTION: The WhatsApp Pain */}
			<section className="bg-foreground py-32 text-background">
				<div className="container mx-auto px-4 md:px-6">
					<div className="grid items-center gap-16 md:grid-cols-2">
						<div>
							<h2 className="mb-8 max-w-xl font-bold font-serif text-4xl tracking-tight md:text-5xl">
								<span className="text-destructive underline decoration-4 decoration-destructive underline-offset-4">
									Drowning
								</span>{" "}
								in Messages?
							</h2>
							<p className="border-primary/50 border-l-2 pl-6 text-background/80 text-xl leading-relaxed">
								"Running operations on WhatsApp is like trying to build a
								skyscraper with duct tape. It works until it collapses."
							</p>

							<div className="mt-12 grid gap-6">
								{[
									{
										title: "No Context",
										desc: "Important updates buried in threads.",
									},
									{
										title: "No Accountability",
										desc: "Who approved this? No one knows.",
									},
									{
										title: "No Data",
										desc: "You can't create reports from chat logs.",
									},
								].map((item) => (
									<div key={item.title} className="flex items-start gap-4">
										<div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-destructive text-destructive">
											<span className="font-bold text-sm">×</span>
										</div>
										<div>
											<div className="font-bold text-lg">{item.title}</div>
											<div className="text-background/60 text-sm">
												{item.desc}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>

						<ChatSimulator />
					</div>
				</div>
			</section>

			{/* FEATURES GRID: Swiss Utility */}
			<MarketingContainer>
				<div className="mb-20">
					<MarketingHeading>Engineered for clarity.</MarketingHeading>
					<div className="mt-4 h-1 w-24 bg-primary" />
				</div>
				<FeaturesGrid />
			</MarketingContainer>

			{/* SOCIAL PROOF: Authentic Origin */}
			<section className="border-border/40 border-y py-24">
				<div className="container mx-auto max-w-3xl px-4 text-center">
					<MarketingHeading as="h3">
						Built because we needed it ourselves.
					</MarketingHeading>

					<p className="mt-6 text-lg text-muted-foreground leading-relaxed">
						We run a real field operations team. WhatsApp was fine for talking,
						but work kept falling through the cracks. KaamSync is the system we
						use every day to track jobs, approvals, and updates — calmly and
						clearly.
					</p>

					<div className="mt-8 font-mono text-muted-foreground text-xs uppercase tracking-widest">
						Internal usage • 50-person team • Offline-first by necessity
					</div>
				</div>
			</section>

			{/* FAQ SECTION */}
			<MarketingContainer className="py-32">
				<div className="mx-auto max-w-4xl text-center">
					<Badge
						variant="outline"
						className="mb-4 rounded-full border-primary/30 px-4 py-1.5 font-bold font-mono text-primary text-xs uppercase tracking-widest"
					>
						FAQ
					</Badge>
					<MarketingHeading className="mb-16">
						Common Questions
					</MarketingHeading>
					<div className="text-left">
						<FAQ items={FAQS} />
					</div>
				</div>
			</MarketingContainer>

			{/* FINAL CTA: High Contrast */}
			<MarketingContainer className="text-center">
				<div className="mx-auto max-w-4xl">
					<MarketingHeading as="h2" className="mb-8">
						Bring order to <br /> the chaos.
					</MarketingHeading>
					<p className="mx-auto mb-12 max-w-xl font-light text-muted-foreground text-xl">
						Join forward-thinking teams moving their operations out of the chat
						and into KaamSync.
					</p>
					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button
							asChild
							size="lg"
							className="h-16 min-w-60 rounded-none bg-primary px-8 font-bold text-lg text-white transition-all hover:scale-105 hover:bg-primary/90"
						>
							<Link to="/signup">
								Try it for your team
								<ChevronRight className="size-5" />
							</Link>
						</Button>
					</div>
					<p className="mt-6 text-muted-foreground text-sm">
						Free for small teams • No Credit Card Required
					</p>
				</div>
			</MarketingContainer>
		</div>
	);
}
