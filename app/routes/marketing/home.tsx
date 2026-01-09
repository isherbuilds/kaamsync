import {
	Activity,
	ArrowRight,
	CheckCircle2,
	ChevronRight,
	Layout,
	Lock,
	Plus,
	Users,
	Zap,
} from "lucide-react";
import { useState } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [
	{ title: "KaamSync - Stop Managing Work in WhatsApp" },
	{
		name: "description",
		content:
			"Stop drowning in chat groups. KaamSync helps field teams manage tasks, approvals, and operations in one simple, offline-first app.",
	},
];

const faqs = [
	{
		q: "How fast can we get started?",
		a: "Setup takes less than 2 minutes. You can create your organization, invite your first 3 team members for free, and start tracking Matters immediately.",
	},
	{
		q: "Does it really work offline?",
		a: "Yes. Our Zero-synced architecture ensures that your team can open the app, log work, and take photos without any internet connection. Everything syncs with zero latency once they're back online.",
	},
	{
		q: "Can we migrate from WhatsApp / Slack?",
		a: "While there's no 'import' from chat, most teams find that starting fresh with structured flows in KaamSync immediately clears up the chaos. You can keep WhatsApp for social chatter and KaamSync for work. (Maybe in the future)",
	},
	{
		q: "Is my data secure?",
		a: "Absolutely. We use bank-grade AES-256 encryption. Your operational Matters are far more secure in KaamSync than in a public messaging app.",
	},
];

function FAQItem({ q, a }: { q: string; a: string }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="group border-border/60 border-b last:border-0">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center justify-between py-6 text-left transition-all hover:text-primary"
			>
				<span className="font-serif text-xl tracking-tight md:text-2xl">
					{q}
				</span>
				<Plus
					className={cn(
						"h-5 w-5 shrink-0 transition-transform duration-300",
						isOpen && "rotate-45",
					)}
				/>
			</button>
			<div
				className={cn(
					"grid transition-all duration-300 ease-in-out",
					isOpen
						? "grid-rows-[1fr] pb-6 opacity-100"
						: "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden">
					<p className="max-w-3xl text-lg text-muted-foreground leading-relaxed">
						{a}
					</p>
				</div>
			</div>
		</div>
	);
}

export default function HomePage() {
	return (
		<div className="flex flex-col bg-background text-foreground">
			{/* HERO SECTION: Design 3 Structure + Design 2 Typography */}
			<section className="relative flex flex-col items-center justify-center border-border/40 border-b pt-24 pb-32">
				<div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />

				<div className="container relative z-10 px-4 text-center md:px-6">
					{/* Status Indicator */}
					{/* <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 backdrop-blur-sm">
						<span className="relative flex size-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-green-500" />
						</span>
						<span className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-widest">
							System Online v2.1
						</span>
					</div> */}

					{/* Headline from Plan */}
					{/* Headline from Plan */}
					<h1 className="mx-auto mb-8 max-w-5xl font-medium font-serif text-5xl leading-[1.1] tracking-tight sm:text-7xl md:text-8xl">
						Turn conversations into <br />
						<span className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
							clear, trackable work.
						</span>
					</h1>

					{/* Subheadline from Plan */}
					<p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl">
						KaamSync helps operations teams track jobs, approvals, and updates
						in one calm workspace — even when teams are offline.
					</p>

					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button
							size="lg"
							className="h-14 min-w-[200px] rounded-none bg-foreground px-8 font-medium text-background text-lg shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] transition-all hover:bg-foreground/90 hover:px-10 hover:shadow-none dark:shadow-[4px_4px_0_0_rgba(255,255,255,0.2)]"
							asChild
						>
							<Link to="/signup">
								Create My Team Space <ArrowRight className="ml-2 size-5" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="h-14 min-w-[200px] rounded-none border-foreground/20 bg-transparent px-8 font-medium text-foreground text-lg hover:bg-muted"
							asChild
						>
							<Link to="/contact">Watch 2-Min Demo</Link>
						</Button>
					</div>

					<p className="mt-6 font-mono text-muted-foreground text-xs uppercase tracking-wide">
						No Credit Card Required • Setup in 2 Minutes
					</p>
				</div>
			</section>

			{/* VISUALIZATION: The Blueprint (Design 3) */}
			<section className="container relative z-20 mx-auto -mt-20 px-4 md:px-6">
				<div className="relative overflow-hidden rounded-none border border-border bg-background shadow-2xl">
					<div className="flex items-center gap-4 border-border border-b bg-muted/30 px-4 py-2">
						<div className="flex gap-2">
							<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
							<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
							<div className="size-3 rounded-full border border-foreground/20 bg-transparent" />
						</div>
						<div className="flex-1 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
							kaamsync_dashboard.view
						</div>
					</div>
					<div className="grid min-h-[400px] grid-cols-12 bg-muted/5 md:min-h-[600px]">
						{/* Sidebar */}
						<div className="col-span-2 hidden flex-col gap-4 border-border border-r bg-background p-4 md:flex">
							{[...Array(6)].map((_, i) => (
								<div
									key={`sidebar-skeleton-${i}`}
									className="h-6 w-full rounded-sm bg-muted/50"
									style={{ animationDelay: `${i * 100}ms` }}
								/>
							))}
						</div>

						{/* Main View */}
						<div className="col-span-12 grid content-start gap-8 p-6 md:col-span-10 md:p-8">
							{/* Stats Row */}
							<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
								{[
									{ label: "Active Jobs", val: "42" },
									{ label: "Completed", val: "18" },
									{ label: "Team Online", val: "12" },
									{ label: "Pending", val: "3" },
								].map((stat) => (
									<div
										key={stat.label}
										className="group border border-border bg-background p-4 transition-colors hover:border-primary"
									>
										<div className="mb-2 font-mono text-[10px] text-muted-foreground uppercase group-hover:text-primary">
											{stat.label}
										</div>
										<div className="font-bold font-sans text-3xl tracking-tighter">
											{stat.val}
										</div>
									</div>
								))}
							</div>

							{/* Map / List Hybrid */}
							<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
								<div className="relative col-span-2 min-h-[300px] border border-border bg-background p-4">
									{/* Fake Map Grid */}
									<div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] opacity-50" />
									<div className="relative z-10 flex h-full items-center justify-center">
										<div className="absolute size-32 animate-ping rounded-full border border-primary/30" />
										<div className="size-4 rounded-full bg-primary ring-4 ring-primary/20" />
										<div className="absolute top-4 right-4 border border-border bg-background px-2 py-1 font-mono text-xs shadow-sm">
											LIVE GPS: ACTIVE
										</div>
									</div>
								</div>
								<div className="flex flex-col gap-3">
									<div className="mb-2 font-bold font-mono text-xs uppercase">
										Recent Updates
									</div>
									{[...Array(5)].map((_, i) => (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: visualization only
											key={i}
											className="flex items-center justify-between border-border/50 border-b pb-2 last:border-0"
										>
											<div className="flex items-center gap-2">
												<div className="size-2 rounded-full bg-green-500" />
												<div className="flex flex-col">
													<span className="font-medium text-xs">
														Site Visit #{204 + i}
													</span>
													<span className="text-[10px] text-muted-foreground">
														Updated by Rahul
													</span>
												</div>
											</div>
											<div className="font-mono text-[10px] text-muted-foreground">
												{10 + i}:00 AM
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* PROBLEM SECTION: The WhatsApp Pain (Design 3) */}
			<section className="bg-foreground py-32 text-background">
				<div className="container mx-auto px-4 md:px-6">
					<div className="grid items-center gap-16 md:grid-cols-2">
						<div>
							<div className="mb-4 font-mono text-primary text-sm uppercase tracking-widest">
								{/* THE PROBLEM */}
							</div>
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

						{/* The Chat Simulator */}
						<div className="relative mx-auto w-full max-w-md">
							<div className="absolute inset-0 bg-linear-to-tr from-primary/20 to-transparent blur-2xl filter" />
							<div className="relative rounded-2xl border border-white/10 bg-black/40 p-6 font-sans shadow-2xl backdrop-blur-md">
								<div className="mb-4 flex items-center justify-between border-white/10 border-b pb-4">
									<div className="flex items-center gap-3">
										<div className="size-10 rounded-full bg-linear-to-br from-purple-500 to-indigo-500" />
										<div>
											<div className="font-bold text-sm text-white">
												Project Alpha Group
											</div>
											<div className="text-white/50 text-xs">
												12 participants
											</div>
										</div>
									</div>
								</div>

								<div className="space-y-4 text-sm">
									<div className="flex gap-3">
										<div className="size-8 shrink-0 rounded-full bg-orange-500" />
										<div className="rounded-2xl rounded-tl-none bg-white/10 p-3 text-white/90">
											Where is the updated invoice for the cement?
											<div className="mt-1 text-[10px] text-white/40">
												10:42 AM
											</div>
										</div>
									</div>

									<div className="flex flex-row-reverse gap-3">
										<div className="size-8 shrink-0 rounded-full bg-blue-500" />
										<div className="rounded-2xl rounded-tr-none bg-primary/20 p-3 text-white/90">
											I sent it yesterday. Check the files.
											<div className="mt-1 text-right text-[10px] text-white/40">
												10:45 AM
											</div>
										</div>
									</div>

									<div className="flex gap-3">
										<div className="size-8 shrink-0 rounded-full bg-orange-500" />
										<div className="rounded-2xl rounded-tl-none bg-white/10 p-3 text-white/90">
											I can't find it. Can you send it again?
											<div className="mt-1 text-[10px] text-white/40">
												10:48 AM
											</div>
										</div>
									</div>

									<div className="flex justify-center py-2">
										<div className="rounded-full bg-white/5 px-3 py-1 text-white/40 text-xs">
											New message from Client...
										</div>
									</div>

									<div className="flex gap-3">
										<div className="size-8 shrink-0 rounded-full bg-green-500" />
										<div className="rounded-2xl rounded-tl-none bg-white/10 p-3 text-white/90">
											<span className="font-bold text-destructive">@Team</span>{" "}
											Why is the site closed today??
											<div className="mt-1 text-[10px] text-white/40">
												11:02 AM
											</div>
										</div>
									</div>
								</div>

								<div className="mt-6 flex items-center gap-2 rounded-full bg-white/5 p-2 px-4 blur-[1px]">
									<div className="text-white/30 text-xs">Type a message...</div>
								</div>

								{/* Overlay Error */}
								<div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
									<div className="rotate-[-5deg] border-2 border-destructive bg-destructive/10 px-6 py-3 font-bold font-mono text-destructive text-xl uppercase tracking-widest backdrop-blur-sm">
										System Failure
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* FEATURES GRID: Swiss Utility (Design 2) */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto max-w-7xl px-4 md:px-6">
					<div className="mb-20">
						<h2 className="font-medium font-serif text-4xl md:text-5xl">
							Engineered for clarity.
						</h2>
						<div className="mt-4 h-1 w-24 bg-primary" />
					</div>

					<div className="grid grid-cols-1 border-foreground/10 border-t border-l md:grid-cols-3">
						{[
							{
								title: "Structured Tasks",
								desc: "Every job has an owner, deadline, and priority. Ambiguity is engineered out.",
								icon: Layout,
							},
							{
								title: "Offline First",
								desc: "Works flawlessly without internet. Syncs automatically when you're back online.",
								icon: Zap,
							},
							{
								title: "Approval Gates",
								desc: "Digital signatures and one-click approvals. Keep a perfect audit trail.",
								icon: CheckCircle2,
							},
							{
								title: "Team Spaces",
								desc: "Keep Finance, HR, and Ops separate. Organizing your business made simple.",
								icon: Users,
							},
							{
								title: "Real-time Telemetry",
								desc: "Live GPS and status updates. Know exactly what's happening on the ground with high-fidelity logs.",
								icon: Activity,
							},
							{
								title: "Bank-Grade Security",
								desc: "AES-256 encryption. Your operational Matters are secure and private. Better than any public chat.",
								icon: Lock,
							},
						].map((feature) => (
							<div
								key={feature.title}
								className="group relative border-foreground/10 border-r border-b p-10 transition-colors hover:bg-muted/30"
							>
								<feature.icon className="mb-6 size-8 stroke-1 text-foreground transition-transform group-hover:scale-110" />
								<h3 className="mb-3 font-medium font-serif text-2xl">
									{feature.title}
								</h3>
								<p className="text-muted-foreground leading-relaxed">
									{feature.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ SECTION */}
			<section className="py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-4xl text-center">
						<Badge
							variant="outline"
							className="mb-4 rounded-full border-primary/30 px-4 py-1.5 font-bold font-mono text-primary text-xs uppercase tracking-widest"
						>
							FAQ
						</Badge>
						<h2 className="mb-16 font-medium font-serif text-4xl md:text-5xl">
							Common Questions
						</h2>
						<div className="border-border/60 border-t text-left">
							{faqs.map((faq) => (
								<FAQItem key={faq.q} {...faq} />
							))}
						</div>
					</div>
				</div>
			</section>

			{/* SOCIAL PROOF: Authentic Origin (Option B) */}
			<section className="border-border/40 border-y py-24">
				<div className="container mx-auto max-w-3xl px-4 text-center">
					<h2 className="font-medium font-serif text-3xl">
						Built because we needed it ourselves.
					</h2>

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

			{/* FINAL CTA: High Contrast */}
			<section className="relative overflow-hidden py-32 text-center">
				<div className="container mx-auto max-w-4xl px-4 md:px-6">
					<h2 className="mb-8 font-medium font-serif text-5xl leading-[1.1] md:text-7xl">
						Bring order to <br /> the chaos.
					</h2>
					<p className="mx-auto mb-12 max-w-xl font-light text-muted-foreground text-xl">
						Join forward-thinking teams moving their operations out of the chat
						and into KaamSync.
					</p>
					<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
						<Button
							asChild
							size="lg"
							className="h-16 min-w-[240px] rounded-none bg-primary px-8 font-bold text-lg text-primary-foreground shadow-xl transition-all hover:scale-105 hover:bg-primary/90"
						>
							<Link to="/signup">
								Create My Team Space <ChevronRight className="ml-2 size-5" />
							</Link>
						</Button>
					</div>
					<p className="mt-6 text-muted-foreground text-sm">
						Free for small teams • No credit card required
					</p>
				</div>
			</section>
		</div>
	);
}
