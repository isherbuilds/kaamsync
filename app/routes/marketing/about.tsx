import { Building2, Heart, Shield, Target, Users, Zap } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
	{ title: "About - KaamSync" },
	{
		name: "description",
		content:
			"We're building the future of work management. Learn about our mission, values, and the team behind KaamSync.",
	},
];

const stats = [
	{ value: "50K+", label: "Active users" },
	{ value: "2,000+", label: "Teams worldwide" },
	{ value: "99.9%", label: "Uptime SLA" },
	{ value: "4.9", label: "Customer rating" },
];

const values = [
	{
		icon: Target,
		title: "Focus",
		description:
			"We build tools that help teams concentrate on what matters most, cutting through noise and distraction.",
	},
	{
		icon: Heart,
		title: "Simplicity",
		description:
			"Powerful doesn't mean complex. We obsess over making our product intuitive and delightful to use.",
	},
	{
		icon: Users,
		title: "Collaboration",
		description:
			"Great work happens together. We design for teams, not individuals working in isolation.",
	},
	{
		icon: Shield,
		title: "Trust",
		description:
			"Your data is sacred. We build with security and privacy as foundational principles, not afterthoughts.",
	},
];

const team = [
	{ name: "Alex Chen", role: "CEO & Co-founder", initials: "AC" },
	{ name: "Sarah Williams", role: "CTO & Co-founder", initials: "SW" },
	{ name: "Michael Park", role: "Head of Product", initials: "MP" },
	{ name: "Emily Rodriguez", role: "Head of Design", initials: "ER" },
];

export default function AboutPage() {
	return (
		<>
			{/* Hero */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="max-w-3xl mx-auto text-center">
						<p className="text-sm font-medium text-primary mb-4">About Us</p>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
							Building the future
							<br />
							of work management
						</h1>
						<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
							We started KaamSync because we believed teams deserve better tools
							— ones that feel good to use and actually help you get things
							done.
						</p>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="py-16 border-y border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
						{stats.map(({ value, label }) => (
							<div key={label}>
								<div className="text-4xl md:text-5xl font-bold mb-1">
									{value}
								</div>
								<div className="text-sm text-muted-foreground">{label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Mission */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
						<div>
							<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-6">
								<Zap className="size-3.5" />
								<span>Our Story</span>
							</div>
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
								Born from frustration with bloated tools
							</h2>
							<div className="space-y-4 text-muted-foreground">
								<p>
									We spent years using project management tools that promised
									simplicity but delivered complexity. Features piled on
									features until the tools became obstacles instead of enablers.
								</p>
								<p>
									In 2023, we set out to build something different — a task
									management platform that professionals actually enjoy using.
									No feature bloat, no steep learning curves, just clean,
									powerful tools.
								</p>
								<p>
									Today, thousands of teams rely on KaamSync to manage their
									most important work. We're just getting started.
								</p>
							</div>
						</div>
						<div className="relative">
							<div className="aspect-square rounded-3xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden flex items-center justify-center">
								<div className="text-center">
									<Building2 className="size-16 mx-auto mb-4 text-muted-foreground/50" />
									<p className="text-sm text-muted-foreground">Founded 2023</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Values */}
			<section className="py-24 md:py-32 border-t border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="text-center mb-16">
						<p className="text-sm font-medium text-primary mb-4">Our Values</p>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight">
							What we believe in
						</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
						{values.map(({ icon: Icon, title, description }) => (
							<div
								key={title}
								className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-8"
							>
								<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
									<Icon className="size-5 text-primary" />
								</div>
								<h3 className="text-lg font-semibold mb-2">{title}</h3>
								<p className="text-muted-foreground">{description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Team */}
			<section className="py-24 md:py-32 border-t border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="text-center mb-16">
						<p className="text-sm font-medium text-primary mb-4">Our Team</p>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
							The people behind KaamSync
						</h2>
						<p className="text-muted-foreground max-w-xl mx-auto">
							A small, focused team obsessed with building the best work
							management experience.
						</p>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4 max-w-4xl mx-auto">
						{team.map(({ name, role, initials }) => (
							<div key={name} className="text-center">
								<div className="size-24 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
									<span className="text-xl font-semibold text-muted-foreground">
										{initials}
									</span>
								</div>
								<h3 className="font-medium">{name}</h3>
								<p className="text-sm text-muted-foreground">{role}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="py-24 md:py-32 border-t border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="relative rounded-3xl border border-border/60 bg-card/30 backdrop-blur-sm p-12 md:p-16 text-center max-w-4xl mx-auto overflow-hidden">
						<div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
						<div className="relative">
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
								Join us on our journey
							</h2>
							<p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
								We're always looking for talented people who share our passion
								for building great products.
							</p>
							<div className="flex flex-col sm:flex-row gap-3 justify-center">
								<Button
									size="lg"
									className="h-11 px-8 rounded-lg bg-foreground text-background hover:bg-foreground/90"
									asChild
								>
									<Link to="/signup">Start Using KaamSync</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-11 px-8 rounded-lg border-border/60"
									asChild
								>
									<Link to="/contact">Contact Us</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
