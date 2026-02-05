import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import { lazy, Suspense } from "react";
import type { MetaFunction } from "react-router";
import { Link, redirect } from "react-router";
import {
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getAuthSession } from "~/lib/auth/offline";
import { marketingMeta } from "~/lib/seo/marketing-meta";
import {
	createFAQPageSchema,
	createOrganizationSchema,
	createSoftwareApplicationSchema,
} from "~/lib/seo/schemas";
import type { Route } from "./+types/home";

export async function clientLoader() {
	if (getAuthSession()) {
		return redirect("/app");
	}
	return null;
}

clientLoader.hydrate = true as const;

// Preload LCP images for both color schemes
export const links: Route.LinksFunction = () => [
	{
		rel: "preload",
		as: "image",
		href: "/static/marketing/dashboard-preview-light.avif",
		type: "image/avif",
		media: "(prefers-color-scheme: light)",
	},
	{
		rel: "preload",
		as: "image",
		href: "/static/marketing/dashboard-preview-dark.avif",
		type: "image/avif",
		media: "(prefers-color-scheme: dark)",
	},
];

const LazyChatSimulator = lazy(async () => {
	const module = await import("~/components/marketing/chat-simulator");
	return { default: module.ChatSimulator };
});

const LazyFeaturesGrid = lazy(async () => {
	const module = await import("~/components/marketing/features-grid");
	return { default: module.FeaturesGrid };
});

const LazyFAQ = lazy(async () => {
	const module = await import("~/components/marketing/faq");
	return { default: module.FAQ };
});

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync | Clear, Trackable Work",
		description:
			"Every request, approval, and task—in one place. Built for operations teams who manage people. Works offline.",
		path: "/",
		twitterTitle: "KaamSync | Stop Losing Work in Messages",
		twitterDescription:
			"Stop losing track of requests. Built for teams that manage people.",
	});

const FAQS = [
	{
		q: "What is a Matter?",
		a: "A Matter is any piece of work that needs tracking—purchase approvals, repair requests, task assignments. Each gets a unique ID (like GEN-123), an owner, and a status. Nothing gets lost.",
	},
	{
		q: "How is this different from project tools?",
		a: "Project tools track deadlines and deliverables. KaamSync tracks requests, approvals, and day-to-day operations. Built for managers who coordinate teams, not PMs who ship products.",
	},
	{
		q: "How fast can we start?",
		a: "2 minutes. Create your workspace, invite 3 people for free, log your first Matter immediately.",
	},
	{
		q: "Does it work offline?",
		a: "Yes. Your team logs work, uploads photos, updates status—all without internet. Syncs automatically when connected.",
	},
	{
		q: "Will this replace our chat apps?",
		a: "Keep chat for quick messages. Move all actual work requests to KaamSync. Within a week, you'll wonder how you tracked work without it.",
	},
	{
		q: "Is our data secure?",
		a: "Yes. HTTPS/TLS encryption, enterprise-grade infrastructure. Your data stays yours—export anytime.",
	},
];

const PAIN_POINTS = [
	{
		title: "Important requests vanish",
		desc: "Urgent approvals buried under hundreds of messages. Your team resends. You still miss them.",
	},
	{
		title: "No record of decisions",
		desc: "Did you approve that expense? When? For how much? Now you're scrolling through weeks of history.",
	},
	{
		title: "Your team works blind",
		desc: "No visibility without internet. You don't know what's done until someone calls you—or doesn't.",
	},
];

const CALM_STEPS = [
	{
		step: "1",
		title: "Create your workspace",
		desc: "2 minutes. Add your teams. Invite your people.",
	},
	{
		step: "2",
		title: "Log your first Matter",
		desc: "Instead of sending a request to chat, create a Matter. Everyone sees it.",
	},
	{
		step: "3",
		title: "Let the system work",
		desc: "Your team updates status. You see everything at a glance.",
	},
];

const structuredData = JSON.stringify([
	createSoftwareApplicationSchema(),
	createOrganizationSchema(),
	createFAQPageSchema(FAQS),
]);

export default function HomePage() {
	return (
		<>
			<script type="application/ld+json">{structuredData}</script>

			<MarketingContainer
				variant="hero"
				className="v-stack center relative border-border/40 border-b pb-0"
			>
				<div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />

				<div className="relative z-10 text-center">
					<MarketingHeading as="h1" className="mx-auto max-w-5xl">
						From conversations to <br />
						<span className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
							clear, trackable work.
						</span>
					</MarketingHeading>

					<p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground leading-relaxed md:text-xl">
						KaamSync helps operations teams track jobs, approvals, and updates
						in one calm workspace — even when teams are offline.
					</p>

					<div className="v-stack items-center justify-center gap-4 sm:h-stack">
						<Button
							size="lg"
							className="h-14 w-full rounded-sm bg-foreground px-8 font-medium text-background text-lg shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] shadow-primary transition-all hover:bg-foreground hover:shadow-none md:max-w-2xs"
							asChild
						>
							<Link to="/signup" prefetch="intent">
								Get Started <ArrowRight className="size-5" />
							</Link>
						</Button>
						<Button
							size="lg"
							variant="link"
							className="h-14 px-8 font-medium text-foreground text-lg hover:bg-muted"
							asChild
						>
							<Link to="/contact" prefetch="intent">
								Talk to Us
							</Link>
						</Button>
					</div>
				</div>
				{/* </section> */}

				{/* <section className="z-20 mx-auto max-w-7xl bg-background px-4 md:px-6"> */}
				<div className="mx-auto mt-6 max-w-7xl rounded border border-foreground/10">
					<picture>
						{/* Dark mode AVIF */}
						<source
							srcSet="/static/marketing/dashboard-preview-dark.avif"
							type="image/avif"
							media="(prefers-color-scheme: dark)"
						/>
						{/* Dark mode PNG fallback */}
						<source
							srcSet="/static/marketing/dashboard-preview-dark.png"
							type="image/png"
							media="(prefers-color-scheme: dark)"
						/>
						{/* Light mode AVIF */}
						<source
							srcSet="/static/marketing/dashboard-preview-light.avif"
							type="image/avif"
							media="(prefers-color-scheme: light)"
						/>
						{/* Light mode PNG fallback */}
						<source
							srcSet="/static/marketing/dashboard-preview-light.png"
							type="image/png"
							media="(prefers-color-scheme: light)"
						/>
						{/* Default light mode fallback */}
						<img
							src="/static/marketing/dashboard-preview-light.png"
							alt="KaamSync dashboard interface showing task management and team coordination"
							width="1440"
							height="900"
							className="h-auto w-full transition-all duration-700 ease-out"
							style={{
								filter: "blur(40px)",
								transform: "scale(1.02)",
							}}
							onLoad={(e) => {
								e.currentTarget.style.filter = "blur(0px)";
								e.currentTarget.style.transform = "scale(1)";
							}}
							loading="eager"
							decoding="async"
							fetchPriority="high"
						/>
					</picture>
				</div>
				<p className="mt-6 font-mono text-xs uppercase tracking-wide">
					Start free • No credit card • 2 minute setup
				</p>
			</MarketingContainer>

			<MarketingContainer
				variant="default"
				className="bg-foreground text-background"
			>
				<div className="grid items-center gap-16 md:grid-cols-2">
					<div>
						<h2 className="mb-6 max-w-xl font-semibold text-4xl tracking-tight md:text-5xl">
							<span className="text-destructive decoration-destructive">
								Requests get buried.
							</span>
						</h2>
						<p className="border-primary/50 border-l-2 pl-4 text-background/80 text-xl leading-relaxed">
							"Managing people across departments. Approvals, requests,
							everything came through scattered messages. I'd spend mornings
							calling people just to find out what was actually getting done."
						</p>

						<div className="mt-12 grid gap-6">
							{PAIN_POINTS.map((item) => (
								<div key={item.title} className="flex items-start gap-4">
									<div className="center mt-1 flex size-6 shrink-0 rounded-full border border-destructive text-destructive">
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

					<Suspense
						fallback={
							<div className="h-full min-h-[360px] rounded-3xl border border-border/40 bg-background/5" />
						}
					>
						<LazyChatSimulator />
						{/*
							When the chat simulator image is ready, replace with:
							<picture>
								<source srcSet="/static/marketing/chat-simulator.avif" type="image/avif" />
								<source srcSet="/static/marketing/chat-simulator.webp" type="image/webp" />
								<img
									src="/static/marketing/chat-simulator.png"
									alt="KaamSync chat simulator"
									width="1200"
									height="720"
									loading="lazy"
									decoding="async"
								/>
							</picture>
						*/}
					</Suspense>
				</div>
			</MarketingContainer>

			<MarketingContainer variant="default">
				<MarketingHeading>Built for clarity.</MarketingHeading>
				<div className="mt-4 h-1 w-24 bg-primary" />
				<div className="mt-8">
					<Suspense
						fallback={
							<div className="grid gap-6 md:grid-cols-3">
								{[1, 2, 3].map((item) => (
									<div
										key={item}
										className="h-40 rounded-2xl border border-border/40 bg-muted/20"
									/>
								))}
							</div>
						}
					>
						<LazyFeaturesGrid />
					</Suspense>
				</div>
			</MarketingContainer>

			<section className="border-border/40 border-y bg-muted/20">
				<MarketingContainer variant="default">
					<div className="mx-auto max-w-4xl text-center">
						<MarketingHeading>Three steps to calm</MarketingHeading>
						<div className="mt-16 grid gap-8 md:grid-cols-3">
							{CALM_STEPS.map((item) => (
								<div key={item.step} className="text-center">
									<div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
										{item.step}
									</div>
									<h3 className="mb-2 font-bold text-lg">{item.title}</h3>
									<p className="text-muted-foreground text-sm">{item.desc}</p>
								</div>
							))}
						</div>
					</div>
				</MarketingContainer>
			</section>

			<MarketingContainer
				variant="compact"
				className="border-border/40 border-y bg-muted/20"
			>
				<div className="mx-auto max-w-3xl text-center">
					<MarketingHeading as="h3">
						Built by someone who lived this.
					</MarketingHeading>

					<p className="mt-6 text-lg text-muted-foreground leading-relaxed">
						"I managed 50 people. Requests came from everywhere—chat, calls,
						in-person. Nothing was tracked. I built KaamSync because I needed
						one place where every request lived."
					</p>

					<div className="mt-8 flex items-center justify-center gap-8 font-mono text-muted-foreground text-xs uppercase tracking-widest">
						<span>50+ people</span>
						<span className="text-muted-foreground/30">•</span>
						<span>12 channels → 1 system</span>
						<span className="text-muted-foreground/30">•</span>
						<span>Zero missed requests</span>
					</div>
				</div>
			</MarketingContainer>

			<MarketingContainer variant="default">
				<div className="mx-auto max-w-4xl text-center">
					<Badge
						variant="outline"
						className="mx-auto mb-4 rounded-full border-primary/30 px-4 py-1.5 font-bold font-mono text-primary text-xs uppercase tracking-widest"
					>
						FAQ
					</Badge>
					<MarketingHeading>Questions?</MarketingHeading>
					<p className="mt-6 mb-16 text-muted-foreground">
						Everything you need to get started.
					</p>
					<div className="text-left">
						<Suspense
							fallback={
								<div className="v-stack gap-4">
									{[1, 2, 3].map((item) => (
										<div
											key={item}
										className="h-16 rounded-xl border border-border/40 bg-muted/20"
										/>
									))}
								</div>
							}
						>
							<LazyFAQ items={FAQS} />
						</Suspense>
					</div>
				</div>
			</MarketingContainer>

			<MarketingContainer variant="cta" className="text-center">
				<div className="mx-auto max-w-4xl">
					<MarketingHeading as="h2">
						Stop losing work in messages.
					</MarketingHeading>
					<p className="text-muted-foreground text-xl">
						Switch chaos with <s>Calm</s> Kaam Sync.
					</p>
					<br />
					<div className="v-stack items-center justify-center gap-4 sm:h-stack">
						<Button
							asChild
							size="lg"
						className="h-16 min-w-60 rounded-none bg-primary px-8 font-bold text-lg text-white transition-all hover:scale-105 hover:bg-primary/80"
						>
							<Link to="/signup" prefetch="intent">
								Start For Free
								<ChevronRight className="size-5" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-16 min-w-60 rounded-none px-8 font-bold text-lg"
						>
							<Link to="/contact" prefetch="intent">
								Ask Us Anything
							</Link>
						</Button>
					</div>
					<p className="mt-6 text-muted-foreground text-sm">
						Start free • No credit card • 2 minute setup
					</p>
				</div>
			</MarketingContainer>
		</>
	);
}
