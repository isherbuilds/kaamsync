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
					<div className="mx-auto max-w-3xl text-center">
						<p className="mb-4 font-medium text-primary text-sm">About Us</p>
						<h1 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
							Building the future
							<br />
							of work management
						</h1>
						<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
							We started KaamSync because we believed teams deserve better tools
							— ones that feel good to use and actually help you get things
							done.
						</p>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="border-border/40 border-y py-16">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 text-center md:grid-cols-4">
						{stats.map(({ value, label }) => (
							<div key={label}>
								<div className="mb-1 font-bold text-4xl md:text-5xl">
									{value}
								</div>
								<div className="text-muted-foreground text-sm">{label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Mission */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
						<div>
							<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-muted-foreground text-sm">
								<Zap className="size-3.5" />
								<span>Our Story</span>
							</div>
							<h2 className="mb-6 font-bold text-3xl tracking-tight md:text-4xl">
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
							<div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-border/60 bg-card/30 backdrop-blur-sm">
								<div className="text-center">
									<Building2 className="mx-auto mb-4 size-16 text-muted-foreground/50" />
									<p className="text-muted-foreground text-sm">Founded 2023</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Values */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mb-16 text-center">
						<p className="mb-4 font-medium text-primary text-sm">Our Values</p>
						<h2 className="font-bold text-3xl tracking-tight md:text-4xl">
							What we believe in
						</h2>
					</div>
					<div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
						{values.map(({ icon: Icon, title, description }) => (
							<div
								key={title}
								className="rounded-2xl border border-border/60 bg-card/30 p-8 backdrop-blur-sm"
							>
								<div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10">
									<Icon className="size-5 text-primary" />
								</div>
								<h3 className="mb-2 font-semibold text-lg">{title}</h3>
								<p className="text-muted-foreground">{description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Team */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mb-16 text-center">
						<p className="mb-4 font-medium text-primary text-sm">Our Team</p>
						<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
							The people behind KaamSync
						</h2>
						<p className="mx-auto max-w-xl text-muted-foreground">
							A small, focused team obsessed with building the best work
							management experience.
						</p>
					</div>
					<div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 md:grid-cols-4">
						{team.map(({ name, role, initials }) => (
							<div key={name} className="text-center">
								<div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm">
									<span className="font-semibold text-muted-foreground text-xl">
										{initials}
									</span>
								</div>
								<h3 className="font-medium">{name}</h3>
								<p className="text-muted-foreground text-sm">{role}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/60 bg-card/30 p-12 text-center backdrop-blur-sm md:p-16">
						<div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
						<div className="relative">
							<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
								Join us on our journey
							</h2>
							<p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
								We're always looking for talented people who share our passion
								for building great products.
							</p>
							<div className="flex flex-col justify-center gap-3 sm:flex-row">
								<Button
									size="lg"
									className="h-11 rounded-lg bg-foreground px-8 text-background hover:bg-foreground/90"
									asChild
								>
									<Link to="/signup">Start Using KaamSync</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-11 rounded-lg border-border/60 px-8"
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
