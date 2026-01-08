import { Building2, Shield, Target, Zap } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
	{ title: "About - KaamSync Mission" },
	{
		name: "description",
		content:
			"We built KaamSync because we were tired of managing field work in chat groups.",
	},
];

export default function AboutPage() {
	return (
		<>
			{/* Hero */}
			<section className="bg-background py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-4xl text-center">
						<div className="mb-6 inline-flex border border-border bg-muted/50 px-3 py-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
							The Mission
						</div>
						<h1 className="mb-8 font-medium font-serif text-5xl tracking-tight md:text-7xl">
							We built this to <br />
							<span className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
								survive our own sites.
							</span>
						</h1>
						<p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl">
							We are an operations team first, software company second. We spent
							years drowning in WhatsApp groups, losing invoices, and chasing
							updates. We built KaamSync because we had to.
						</p>
					</div>
				</div>
			</section>

			{/* Authentic Stats (No Fake Scalability Numbers) */}
			<section className="border-border/40 border-y bg-muted/20 py-16">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-5xl grid-cols-2 gap-12 text-center md:grid-cols-4">
						{[
							{ value: "100%", label: "Offline Capable" },
							{ value: "0", label: "Lost Invoices" },
							{ value: "50+", label: "Field Staff" },
							{ value: "24/7", label: "Sync Uptime" },
						].map(({ value, label }) => (
							<div key={label} className="flex flex-col items-center">
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

			{/* Origin Story - The "Why" */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-16 lg:grid-cols-2">
						<div className="sticky top-24">
							<div className="mb-6 font-mono text-destructive text-xs uppercase tracking-widest">
								The Problem
							</div>
							<h2 className="mb-6 font-medium font-serif text-4xl tracking-tight">
								"Does anyone have the latest drawing?"
							</h2>
							<p className="text-lg text-muted-foreground leading-relaxed">
								That single question used to cost us hours.
							</p>
							<p className="mt-4 text-lg text-muted-foreground leading-relaxed">
								In 2023, our field operations were a mess of 50+ WhatsApp
								groups. Important decisions were buried under "Good Morning"
								GIFs. Approvals were lost in the scroll. We tried generic PM
								tools, but they were too complex for guys on site.
							</p>
							<p className="mt-4 border-primary border-l-4 pl-4 font-medium text-foreground text-xl italic">
								"We didn't need a feature-rich SaaS. We needed a digital
								clipboard that worked offline."
							</p>
						</div>

						<div className="space-y-8">
							<div className="border border-border bg-background p-8 shadow-sm">
								<div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
									<Target className="size-5" />
								</div>
								<h3 className="mb-2 font-bold font-serif text-2xl">
									Principle 1: Clarity
								</h3>
								<p className="text-muted-foreground">
									A message is not a task. We separated "chatter" from "work".
									Every job in KaamSync has an owner, a status, and a deadline.
								</p>
							</div>

							<div className="border border-border bg-background p-8 shadow-sm">
								<div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
									<Zap className="size-5" />
								</div>
								<h3 className="mb-2 font-bold font-serif text-2xl">
									Principle 2: Speed
								</h3>
								<p className="text-muted-foreground">
									Field sites have bad reception. We engineered a local-first
									database so your team can work in a basement or a tunnel, and
									sync when they resurface.
								</p>
							</div>

							<div className="border border-border bg-background p-8 shadow-sm">
								<div className="mb-4 flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
									<Shield className="size-5" />
								</div>
								<h3 className="mb-2 font-bold font-serif text-2xl">
									Principle 3: Accountability
								</h3>
								<p className="text-muted-foreground">
									No more "I didn't see that message." Every approval is logged.
									Every change is tracked. The system is the single source of
									truth.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-border border-t bg-foreground py-24 text-center text-background">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-3xl">
						<h2 className="mb-6 font-medium font-serif text-3xl md:text-5xl">
							Stop drowning in chat.
						</h2>
						<p className="mb-10 text-lg opacity-80">
							Join us in the calm, organized world of structured operations.
						</p>
						<div className="flex flex-col justify-center gap-4 sm:flex-row">
							<Button
								size="lg"
								className="h-16 rounded-none bg-primary px-8 font-bold text-lg text-primary-foreground hover:bg-primary/90"
								asChild
							>
								<Link to="/signup">Create My Team Space</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
