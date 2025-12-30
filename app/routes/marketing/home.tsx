import {
	ArrowRight,
	CheckCircle2,
	Clock,
	Lock,
	MessageSquare,
	RefreshCw,
	Shield,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
	{ title: "KaamSync - Work doesn't belong in the chat" },
	{
		name: "description",
		content:
			"Stop drowning in dm's. KaamSync brings your operations out of the noise and into a system built for clarity, speed, and control.",
	},
];

const problems = [
	{
		icon: MessageSquare,
		title: "Lost Context",
		desc: "Important requests get buried in endless chat threads.",
	},
	{
		icon: ShieldCheck,
		title: "No Accountability",
		desc: "No clear trail of who approved what and when.",
	},
	{
		icon: Clock,
		title: "Time Wasted",
		desc: "Hours spent chasing updates instead of doing actual work.",
	},
] as const;

// const logos = [
// 	"Meridian Partners",
// 	"Apex Industries",
// 	"Sterling Group",
// 	"Nova Consulting",
// ];

const enterprise = [
	{
		icon: Shield,
		title: "Enterprise Security",
		description: "SOC 2 compliant, SSO support",
	},
	{
		icon: RefreshCw,
		title: "Real-time Sync",
		description: "Changes appear instantly",
	},
	{ icon: Lock, title: "Privacy First", description: "End-to-end encryption" },
	{ icon: Zap, title: "Lightning Fast", description: "Sub-100ms load times" },
];

export default function HomePage() {
	return (
		<>
			{/* Hero */}
			<section className="relative overflow-hidden py-24">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto flex max-w-5xl flex-col items-center text-center">
						<Link
							to="/features"
							className="group mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-muted-foreground text-sm backdrop-blur-sm transition-all hover:border-border hover:bg-muted/50"
						>
							<Sparkles className="size-3.5 text-primary" />
							<span className="font-medium">Introducing KaamSync v1.0</span>
							<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
						</Link>

						<h1 className="mb-6 font-bold text-4xl leading-[1.1] tracking-tight md:text-6xl lg:text-[5.5rem]">
							Work doesn't belong
							<br />
							<span className="bg-linear-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
								in the chat.
							</span>
						</h1>

						<p className="mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed">
							Stop chasing messages. KaamSync gives your team a single place to
							manage tasks, track approvals, and get work done without the
							noise.
						</p>

						<div className="mb-20 flex flex-col items-center gap-4 sm:flex-row">
							<Button
								size="lg"
								className="h-12 gap-2 rounded-xl bg-foreground px-8 text-background text-base shadow-foreground/5 shadow-lg hover:bg-foreground/90"
								asChild
							>
								<Link to="/signup">
									Start for Free <ArrowRight className="size-4" />
								</Link>
							</Button>
							<Button
								size="lg"
								variant="link"
								className="text-foreground"
								asChild
							>
								<Link to="/contact">Book a Demo</Link>
							</Button>
						</div>

						{/* Hero Visual - Product Screenshot */}
						<div className="perspective-[2000px] group relative mx-auto w-full max-w-5xl">
							{/* Glow effect */}
							<div className="absolute -inset-1 rounded-xl bg-linear-to-r from-primary/20 to-purple-500/20 opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-75" />

							<div className="relative origin-top rotate-x-15 transform overflow-hidden rounded-xl border border-border/40 bg-background/80 shadow-2xl backdrop-blur-xl transition-transform duration-700 ease-out group-hover:rotate-x-0">
								{/* Browser Header */}
								<div className="flex h-10 items-center gap-2 border-border/40 border-b bg-muted/30 px-4">
									<div className="flex gap-1.5">
										<div className="size-3 rounded-full border border-red-500/30 bg-red-500/20" />
										<div className="size-3 rounded-full border border-yellow-500/30 bg-yellow-500/20" />
										<div className="size-3 rounded-full border border-green-500/30 bg-green-500/20" />
									</div>
									<div className="ml-4 flex flex-1 justify-center">
										<div className="flex h-5 items-center rounded-md bg-muted/50 px-4 text-muted-foreground text-xs">
											kaamsync.com
										</div>
									</div>
								</div>

								{/* Screenshot Container - Replace src with your actual screenshot */}
								<div className="relative aspect-16/10 bg-muted/20">
									{/* 
										TODO: Replace this with your actual product screenshot
										<img 
											src="/images/product-screenshot.png" 
											alt="KaamSync task management dashboard" 
											className="w-full h-full object-cover object-top"
										/>
									*/}
									{/* Placeholder - remove when you add real screenshot */}
									<div className="absolute inset-0 flex items-center justify-center bg-muted/30">
										<div className="space-y-3 p-8 text-center">
											<div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10">
												<Sparkles className="size-8 text-primary" />
											</div>
											<p className="text-muted-foreground text-sm">
												Add your product screenshot here
											</p>
											<p className="text-muted-foreground/60 text-xs">
												Recommended: 1920×1200px PNG
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Floating notification */}
							<div className="absolute top-1/4 -right-4 hidden lg:block">
								<div className="animate-pulse rounded-lg border border-border/60 bg-card p-3 shadow-lg">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="size-4 text-green-500" />
										<span className="font-medium text-xs">Task approved!</span>
									</div>
								</div>
							</div>

							<div className="absolute bottom-1/4 -left-4 hidden lg:block">
								<div className="rounded-lg border border-border/60 bg-card p-3 shadow-lg">
									<div className="flex items-center gap-2">
										<RefreshCw className="size-4 text-blue-500" />
										<span className="text-muted-foreground text-xs">
											Synced just now
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Feature Stats - Honest, feature-based */}
					<div className="mx-auto mt-20 max-w-4xl">
						<div className="grid grid-cols-3 gap-6 md:gap-12">
							{[
								{
									value: "Real-time",
									label: "Instant sync across all devices",
									icon: RefreshCw,
								},
								{
									value: "Offline",
									label: "Works without internet",
									icon: Zap,
								},
								{
									value: "<50ms",
									label: "Near-instant response time",
									icon: Clock,
								},
							].map((stat) => (
								<div key={stat.label} className="text-center">
									<div className="mb-1 flex items-center justify-center gap-2">
										<stat.icon className="size-5 text-primary" />
										<p className="font-bold text-xl md:text-2xl">
											{stat.value}
										</p>
									</div>
									<p className="text-muted-foreground text-xs md:text-sm">
										{stat.label}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Built for teams callout - replaces fake logos */}
					<div className="mt-16 border-border/40 border-t pt-10">
						<p className="mb-6 text-center text-muted-foreground text-sm">
							Built for operations teams who are tired of chasing messages
						</p>
						<div className="flex flex-wrap items-center justify-center gap-3">
							{[
								"Office Managers",
								"Site Supervisors",
								"HR Teams",
								"Facility Managers",
								"Small Businesses",
							].map((role) => (
								<span
									key={role}
									className="rounded-full border border-border/40 bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground text-xs"
								>
									{role}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Problem Section */}
			<section className="border-border/40 border-t py-24">
				<div className="container mx-auto px-4 md:px-6">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div className="space-y-8">
							<div className="space-y-4">
								<p className="font-medium text-primary text-sm">The Problem</p>
								<h2 className="font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl">
									Drowning in messages?
								</h2>
								<p className="text-lg text-muted-foreground leading-relaxed">
									"Did you see my message?" shouldn't be your most common
									question. Chat is great for conversation — but terrible for
									tracking work.
								</p>
							</div>
							<div className="space-y-5">
								{problems.map(({ icon: Icon, title, desc }) => (
									<div key={title} className="group flex items-start gap-4">
										<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
											<Icon className="size-5" />
										</div>
										<div>
											<h3 className="mb-1 font-medium">{title}</h3>
											<p className="text-muted-foreground text-sm">{desc}</p>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Visual */}
						<div className="relative lg:pl-8">
							<div className="absolute inset-0 rounded-3xl bg-linear-to-br from-destructive/5 to-orange-500/5 blur-3xl" />
							<div className="relative rounded-2xl border border-border/60 bg-card/50 p-6 shadow-xl backdrop-blur-sm">
								<div className="space-y-4">
									{[
										{ align: "left", lines: [32, 24] },
										{ align: "right", lines: [28, 20] },
										{ align: "left", lines: [36, 16] },
									].map((msg) => (
										<div
											key={`${msg.align}-${msg.lines.join("-")}`}
											className={`flex gap-3 ${msg.align === "right" ? "flex-row-reverse" : ""}`}
										>
											<div className="size-8 shrink-0 rounded-full bg-muted" />
											<div
												className={`max-w-[70%] rounded-xl px-4 py-3 ${msg.align === "right" ? "bg-primary/10" : "bg-muted"}`}
											>
												{msg.lines.map((w) => (
													<div
														key={w}
														className={`mt-2 h-2 rounded bg-current opacity-10`}
														style={{ width: w * 4 }}
													/>
												))}
											</div>
										</div>
									))}
									<div className="mt-6 flex h-16 items-center justify-center rounded-xl border-2 border-destructive/30 border-dashed bg-destructive/5">
										<span className="font-medium text-destructive text-sm">
											Where did that request go?
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features - Bento Grid */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<p className="mb-4 font-medium text-primary text-sm">
							The Solution
						</p>
						<h2 className="mb-4 text-balance font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl">
							Everything you need to manage work
						</h2>
						<p className="text-lg text-muted-foreground">
							KaamSync replaces the noise with structured workflows built for
							how your team actually operates.
						</p>
					</div>

					{/* Bento Grid - Tailwind inspired */}
					<div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:mt-16 lg:grid-cols-3 lg:grid-rows-2">
						{/* Large card - left */}
						<div className="relative lg:row-span-2">
							<div className="absolute inset-px rounded-lg bg-card lg:rounded-l-4xl" />
							<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-l-[calc(2rem+1px)]">
								<div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
									<p className="mt-2 font-medium text-lg tracking-tight max-lg:text-center">
										Structured Tasks
									</p>
									<p className="mt-2 max-w-lg text-muted-foreground text-sm max-lg:text-center">
										Every task has an owner, deadline, and priority. No more
										ambiguity about who's doing what.
									</p>
								</div>
								<div className="relative min-h-120 w-full grow max-lg:mx-auto max-lg:max-w-sm">
									<div className="absolute inset-x-10 top-10 bottom-0 overflow-hidden rounded-t-xl border-border/60 border-x-4 border-t-4 bg-muted/30">
										<div className="space-y-3 p-4">
											{[
												{
													id: "TASK-102",
													title: "Q3 Financial Report",
													status: "In Progress",
													assignee: "Sarah",
												},
												{
													id: "TASK-103",
													title: "Update vendor contracts",
													status: "Pending",
													assignee: "Mike",
												},
												{
													id: "TASK-104",
													title: "Team sync meeting",
													status: "Done",
													assignee: "You",
												},
											].map((task) => (
												<div
													key={task.id}
													className="rounded-lg border border-border/60 bg-background p-3"
												>
													<div className="mb-2 flex items-center justify-between text-muted-foreground text-xs">
														<span className="font-mono">{task.id}</span>
														<span
															className={`rounded-full px-2 py-0.5 text-xs ${task.status === "Done" ? "bg-green-500/10 text-green-500" : task.status === "In Progress" ? "bg-blue-500/10 text-blue-500" : "bg-yellow-500/10 text-yellow-500"}`}
														>
															{task.status}
														</span>
													</div>
													<p className="font-medium text-sm">{task.title}</p>
													<p className="mt-1 text-muted-foreground text-xs">
														Assigned to {task.assignee}
													</p>
												</div>
											))}
										</div>
									</div>
								</div>
							</div>
							<div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-border/60 lg:rounded-l-4xl" />
						</div>

						{/* Top middle card */}
						<div className="relative max-lg:row-start-1">
							<div className="absolute inset-px rounded-lg bg-card max-lg:rounded-t-4xl" />
							<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)]">
								<div className="px-8 pt-8 sm:px-10 sm:pt-10">
									<p className="mt-2 font-medium text-lg tracking-tight max-lg:text-center">
										Approval Workflows
									</p>
									<p className="mt-2 max-w-lg text-muted-foreground text-sm max-lg:text-center">
										One-click approvals with full audit trails. Know exactly
										where things stand.
									</p>
								</div>
								<div className="flex flex-1 items-center justify-center px-8 max-lg:pt-10 max-lg:pb-12 sm:px-10 lg:pb-2">
									<div className="w-full max-w-xs space-y-2">
										<div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3">
											<div className="flex size-8 items-center justify-center rounded-full bg-green-500/10">
												<CheckCircle2 className="size-4 text-green-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-sm">
													Budget approved
												</p>
												<p className="text-muted-foreground text-xs">
													by Finance Team
												</p>
											</div>
										</div>
										<div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3">
											<div className="flex size-8 items-center justify-center rounded-full bg-yellow-500/10">
												<Clock className="size-4 text-yellow-500" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate font-medium text-sm">
													Waiting for review
												</p>
												<p className="text-muted-foreground text-xs">
													2 approvers left
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
							<div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-border/60 max-lg:rounded-t-4xl" />
						</div>

						{/* Bottom middle card */}
						<div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
							<div className="absolute inset-px rounded-lg bg-card" />
							<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)]">
								<div className="px-8 pt-8 sm:px-10 sm:pt-10">
									<p className="mt-2 font-medium text-lg tracking-tight max-lg:text-center">
										Team Teams
									</p>
									<p className="mt-2 max-w-lg text-muted-foreground text-sm max-lg:text-center">
										Dedicated spaces for each department. Keep work organized.
									</p>
								</div>
								<div className="flex flex-1 items-center px-8 max-lg:py-6 sm:px-10 lg:pb-2">
									<div className="flex gap-2 overflow-hidden">
										{["Finance", "Marketing", "Engineering", "HR"].map(
											(dept) => (
												<div
													key={dept}
													className="shrink-0 rounded-lg border border-border/60 bg-background px-3 py-2 font-medium text-xs"
												>
													{dept}
												</div>
											),
										)}
									</div>
								</div>
							</div>
							<div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-border/60" />
						</div>

						{/* Large card - right */}
						<div className="relative lg:row-span-2">
							<div className="absolute inset-px rounded-lg bg-card max-lg:rounded-b-4xl lg:rounded-r-4xl" />
							<div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
								<div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
									<p className="mt-2 font-medium text-lg tracking-tight max-lg:text-center">
										Works Offline
									</p>
									<p className="mt-2 max-w-lg text-muted-foreground text-sm max-lg:text-center">
										Keep working even without internet. Everything syncs when
										you're back online.
									</p>
								</div>
								<div className="relative min-h-120 w-full grow">
									<div className="absolute top-10 right-0 bottom-0 left-10 overflow-hidden rounded-tl-xl border-border/60 border-t border-l bg-muted/30">
										<div className="flex border-border/40 border-b bg-muted/50">
											<div className="flex font-medium text-muted-foreground text-sm">
												<div className="border-border/40 border-r border-b bg-background px-4 py-2 text-foreground text-xs">
													sync-status.tsx
												</div>
												<div className="border-border/40 border-r px-4 py-2 text-xs">
													app.tsx
												</div>
											</div>
										</div>
										<div className="space-y-1 px-6 pt-6 font-mono text-muted-foreground text-xs">
											<p>
												<span className="text-blue-400">const</span> status =
												useSync();
											</p>
											<p className="mt-4">
												<span className="text-blue-400">if</span>{" "}
												(status.offline) {"{"}
											</p>
											<p className="pl-4">
												<span className="text-green-400">{`// Work continues locally`}</span>
											</p>
											<p className="pl-4">saveToLocalCache(data);</p>
											<p>{"}"}</p>
											<p className="mt-4">
												<span className="text-green-400">{`// Auto-sync when back`}</span>
											</p>
											<p>syncWhenOnline();</p>
										</div>
									</div>
								</div>
							</div>
							<div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-border/60 max-lg:rounded-b-4xl lg:rounded-r-4xl" />
						</div>
					</div>
				</div>
			</section>

			{/* Enterprise features */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mb-12 text-center">
						<p className="mb-4 font-medium text-primary text-sm">
							Enterprise Ready
						</p>
						<h2 className="font-bold text-3xl tracking-tight md:text-4xl">
							Built for scale
						</h2>
					</div>
					<div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{enterprise.map(({ icon: Icon, title, description }) => (
							<div key={title} className="group relative">
								<div className="absolute inset-px rounded-xl bg-card" />
								<div className="relative rounded-xl p-6 text-center">
									<div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-muted/50">
										<Icon className="size-5 text-muted-foreground" />
									</div>
									<h3 className="mb-1 font-medium text-sm">{title}</h3>
									<p className="text-muted-foreground text-xs">{description}</p>
								</div>
								<div className="pointer-events-none absolute inset-px rounded-xl ring-1 ring-border/60" />
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
							<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl">
								Ready to get started?
							</h2>
							<p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
								Join teams who have moved their operations out of the chat and
								into KaamSync.
							</p>
							<div className="flex flex-col justify-center gap-3 sm:flex-row">
								<Button
									size="lg"
									className="h-11 rounded-lg bg-foreground px-8 text-background hover:bg-foreground/90"
									asChild
								>
									<Link to="/signup">Start for Free</Link>
								</Button>
								<Button
									size="lg"
									variant="outline"
									className="h-11 rounded-lg px-8"
									asChild
								>
									<Link to="/contact">Talk to Sales</Link>
								</Button>
							</div>
							<p className="mt-6 text-muted-foreground/60 text-sm">
								No credit card required • Free for teams up to 5
							</p>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
