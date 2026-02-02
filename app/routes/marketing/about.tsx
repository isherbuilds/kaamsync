import Shield from "lucide-react/dist/esm/icons/shield";
import Target from "lucide-react/dist/esm/icons/target";
import Zap from "lucide-react/dist/esm/icons/zap";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { Button } from "~/components/ui/button";
import { marketingMeta } from "~/lib/seo/marketing-meta";
import { createOrganizationSchema } from "~/lib/seo/schemas";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "About KaamSync | Built for Operations Teams",
		description:
			"Built by someone managing 50 people through scattered messages. Now sharing the system that finally worked.",
		path: "/about",
		twitterDescription:
			"Why we built a tool for operations teams drowning in messages.",
	});

const structuredData = JSON.stringify(createOrganizationSchema());

export default function AboutPage() {
	return (
		<>
			<script type="application/ld+json">{structuredData}</script>

			<MarketingContainer
				variant="hero"
				className="border-border/40 border-b text-center"
			>
				<div className="mx-auto max-w-4xl">
					<MarketingBadge>Our Story</MarketingBadge>
					<MarketingHeading as="h2">
						Built because nothing else worked.
						<br />
						<span className="italic">Shared because you're not alone.</span>
					</MarketingHeading>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
						I tried project tools and spreadsheets. None understood that
						managing people isn't like managing code. So I built what I actually
						needed.
					</p>
				</div>
			</MarketingContainer>

			<section className="border-border/40 border-b bg-muted/20">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-4xl grid-cols-2 gap-12 text-center md:grid-cols-4">
						{[
							{ value: "50+", label: "People Coordinated" },
							{ value: "Zero", label: "Missed Requests" },
							{ value: "100%", label: "Works Offline" },
							{ value: "2min", label: "To First Matter" },
						].map(({ value, label }) => (
							<div key={label} className="v-stack items-center">
								<div className="mb-2 font-bold font-mono text-4xl text-primary md:text-5xl">
									{value}
								</div>
								<div className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
									{label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			<MarketingContainer variant="default">
				<div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-16 lg:grid-cols-2">
					<div className="sticky top-24">
						<div className="mb-6 font-mono text-destructive text-xs uppercase tracking-widest">
							The Breaking Point
						</div>
						<MarketingHeading>"Wait, did I approve that?"</MarketingHeading>
						<p className="text-lg text-muted-foreground">
							That question. Asked a dozen times a day.
						</p>
						<p className="mt-4 text-lg text-muted-foreground">
							My team came at me from every direction—chat groups, email, calls,
							hallway conversations. Approvals vanished. Repair requests were
							forgotten. I'd spend mornings calling people just to find out what
							was happening.
						</p>
						<p className="mt-4 border-primary border-l-4 pl-4 font-medium text-foreground text-xl italic">
							"I needed one place where every request lived. Where nothing could
							get buried."
						</p>
					</div>

					<div className="space-y-8">
						{[
							{
								icon: Target,
								title: "Clarity Over Chatter",
								desc: "A message is not a task. Every Matter has an owner, status, and due date. No ambiguity. No 'I thought someone else was handling it.'",
							},
							{
								icon: Zap,
								title: "Work Offline, Sync Later",
								desc: "Your team doesn't always have internet. Log tasks, upload photos, update status—all offline. Syncs when connected.",
							},
							{
								icon: Shield,
								title: "Everything Tracked",
								desc: "Every request, approval, and status change is logged. The system becomes your single source of truth—not your memory.",
							},
						].map((principle) => (
							<div
								key={principle.title}
								className="border border-border bg-background p-8 shadow-sm"
							>
								<div className="center mb-4 flex size-10 rounded-sm bg-primary/10 text-primary">
									<principle.icon className="size-5" />
								</div>
								<h3 className="mb-2 font-bold font-serif text-2xl">
									{principle.title}
								</h3>
								<p className="text-muted-foreground">{principle.desc}</p>
							</div>
						))}
					</div>
				</div>
			</MarketingContainer>

			<section className="border-border border-t bg-foreground py-24 text-center text-background">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-3xl">
						<MarketingHeading>Join the calm side.</MarketingHeading>
						<p className="mb-10 text-lg opacity-80">
							Tired of work disappearing into messages? You're not alone.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button
								size="lg"
								className="h-16 rounded-none bg-primary px-8 font-bold text-lg text-primary-foreground hover:bg-primary/90"
								asChild
							>
								<Link to="/signup">Start For Free</Link>
							</Button>
							<Button
								size="lg"
								variant="outline"
								className="h-16 rounded-none border-background/30 bg-transparent px-8 font-bold text-background text-lg hover:bg-background/10"
								asChild
							>
								<Link to="/contact">Ask Us Anything</Link>
							</Button>
						</div>
						<p className="mt-6 text-background/60 text-sm">
							Free for 3 team members • No credit card required
						</p>
					</div>
				</div>
			</section>
		</>
	);
}
