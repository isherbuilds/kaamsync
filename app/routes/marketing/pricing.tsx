import Building2 from "lucide-react/dist/esm/icons/building-2";
import Check from "lucide-react/dist/esm/icons/check";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Users from "lucide-react/dist/esm/icons/users";
import Zap from "lucide-react/dist/esm/icons/zap";
import { type ReactNode, useState } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { MarketingCTA } from "~/components/marketing/cta-section";
import { FAQ } from "~/components/marketing/faq";
import {
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	type BillingInterval,
	type ProductKey,
	products,
} from "~/config/billing";
import { marketingMeta } from "~/lib/seo/marketing-meta";
import { createFAQPageSchema } from "~/lib/seo/schemas";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "KaamSync Pricing | Free for Small Teams, Scale as You Grow",
		description:
			"Start free. Growth plans from $29/month. No hidden fees. Cancel anytime. Non-profits get 50% off.",
		path: "/pricing",
		twitterTitle: "KaamSync Pricing Plans",
		twitterDescription: "Start free. Simple pricing, no surprises.",
	});

const faqs = [
	{
		q: "Is the free plan really free?",
		a: "Yes. Starter is free forever for up to 3 team members. No credit card required. No time limit. It's our way of letting small teams get organized without risk.",
	},
	{
		q: "Can I change plans later?",
		a: "Absolutely. Upgrade or downgrade anytime from your dashboard. Upgrades take effect immediately. Downgrades apply at your next billing cycle. We pro-rate everything fairly.",
	},
	{
		q: "What counts as a 'team member'?",
		a: "Anyone who needs to create, assign, or approve Matters. Viewers (people who just need to see status) don't count toward your limit. Most teams start with just their core operators.",
	},
	{
		q: "Do you offer non-profit discounts?",
		a: "Yes. Registered non-profits and educational institutions get 50% off all annual plans. Contact us with your registration documents and we'll apply the discount.",
	},
	{
		q: "What happens to my data if I cancel?",
		a: "Your data stays yours. If you cancel, you keep read-only access to all your Matters. You can export everything before you leave. We never hold your data hostage.",
	},
	{
		q: "Can I pay yearly?",
		a: "Yes—and you save about 17% (2 months free). Choose yearly at checkout or switch anytime from your billing settings.",
	},
	{
		q: "What payment methods do you accept?",
		a: "All major credit cards through our secure payment processor. Enterprise customers can also pay via bank transfer or invoice.",
	},
	{
		q: "How fast is support?",
		a: "Starter plans get community and documentation support. Growth and Pro plans get priority email support with responses within 24 hours—usually much faster. Enterprise gets a dedicated account manager.",
	},
];

const planIcons: Record<ProductKey, ReactNode> = {
	starter: <Users className="size-5" />,
	growth: <Zap className="size-5" />,
	pro: <ShieldCheck className="size-5" />,
	enterprise: <Building2 className="size-5" />,
};

const planDescriptions: Record<ProductKey, string> = {
	starter:
		"Test with up to 3 people. Free forever. No credit card—just see if it works.",
	growth:
		"For teams done losing track of requests. One organized system where nothing gets buried.",
	pro: "Multiple departments, complex workflows. Full picture with API access.",
	enterprise:
		"Custom integrations, SLAs, and dedicated support for your specific needs.",
};

const offerSchema = {
	"@context": "https://schema.org",
	"@type": "Product",
	name: "KaamSync",
	description: "People management and work tracking for operations teams",
	brand: {
		"@type": "Brand",
		name: "KaamSync",
	},
	offers: [
		{
			"@type": "Offer",
			name: "Starter",
			description: "Free for up to 3 team members",
			price: "0",
			priceCurrency: "USD",
			availability: "https://schema.org/InStock",
		},
		{
			"@type": "Offer",
			name: "Growth",
			description: "For growing teams ready to scale",
			price: "29",
			priceCurrency: "USD",
			availability: "https://schema.org/InStock",
			priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
		},
		{
			"@type": "Offer",
			name: "Pro",
			description: "For established teams that need more control",
			price: "79",
			priceCurrency: "USD",
			availability: "https://schema.org/InStock",
			priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
				.toISOString()
				.split("T")[0],
		},
	],
};

const structuredData = JSON.stringify([offerSchema, createFAQPageSchema(faqs)]);

export default function PricingPage() {
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const planKeys: ProductKey[] = ["starter", "growth", "pro", "enterprise"];

	const formatPrice = (cents: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(cents / 100);
	};

	return (
		<>
			<script type="application/ld+json">{structuredData}</script>

			<section className="relative border-border/40 border-b bg-background pt-24 pb-16 text-center">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-3xl">
						<MarketingHeading as="h2" className="mb-6">
							Start free.
							<br />
							<span className="italic">Grow when it works.</span>
						</MarketingHeading>
						<p className="mb-10 text-muted-foreground text-xl">
							Start Free. No credit card. No time limit.
						</p>

						{/* Billing Toggle */}
						<div className="center flex flex-col items-center gap-4">
							<Tabs
								value={interval}
								onValueChange={(value) => setInterval(value as BillingInterval)}
								className="w-full max-w-80"
							>
								<TabsList className="w-full bg-secondary">
									<TabsTrigger value="monthly">Monthly</TabsTrigger>
									<TabsTrigger value="yearly" className="relative">
										Yearly
										<Badge
											variant="secondary"
											className="ml-2 rounded border-green-500/20 bg-green-500/10 text-green-600"
										>
											2 months free
										</Badge>
									</TabsTrigger>
								</TabsList>
							</Tabs>
							{interval === "yearly" && (
								<p className="font-medium text-green-600 text-sm">
									You save ~17% with yearly billing
								</p>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Plans */}
			<section className="relative bg-background">
				<div className="container relative z-10 mx-auto px-4 md:px-6">
					<div className="mx-auto grid max-w-7xl grid-cols-1 gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-4">
						{planKeys.map((key) => {
							const plan = products[key];
							const monthlyPrice = plan.monthlyPrice;
							const yearlyPrice = plan.yearlyPrice;

							const isYearly = interval === "yearly";
							const price = isYearly ? yearlyPrice : monthlyPrice;
							const originalYearly = monthlyPrice ? monthlyPrice * 12 : 0;

							const isPopular = plan.popular;
							const isEnterprise = key === "enterprise";
							const hasUsage = "hasAddons" in plan && plan.hasAddons;

							return (
								<div
									key={key}
									className={cn(
										"v-stack relative bg-background p-8 transition-all duration-300",
										isPopular && "z-10 ring-2 ring-primary",
									)}
								>
									{isPopular && (
										<div className="absolute top-0 left-1/2 -mt-3 w-max -translate-x-1/2">
											<span className="bg-primary px-3 py-1 font-bold font-mono text-primary-foreground text-xs uppercase tracking-widest shadow-sm">
												Recommended
											</span>
										</div>
									)}
									<div className="mb-8">
										<div className="mb-4 flex items-center gap-2">
											<div
												className={cn(
													"rounded-lg p-2",
													isPopular ? "bg-primary/20" : "bg-muted",
												)}
											>
												{planIcons[key]}
											</div>
											<h3 className="font-medium font-serif text-2xl">
												{plan.name}
											</h3>
										</div>
										<p className="text-muted-foreground text-sm leading-relaxed">
											{planDescriptions[key]}
										</p>
									</div>

									<div className="mb-8">
										<div className="flex items-baseline gap-1">
											{price === null ? (
												<span className="font-bold font-sans text-4xl">
													Custom
												</span>
											) : price === 0 ? (
												<span className="font-bold font-sans text-4xl">
													Free
												</span>
											) : (
												<>
													{isYearly && (
														<span className="mr-2 text-2xl text-muted-foreground line-through decoration-muted-foreground/50">
															{formatPrice(originalYearly)}
														</span>
													)}
													<span className="font-bold font-sans text-4xl">
														{formatPrice(price)}
													</span>
													<span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
														{isYearly ? "/ year" : "/ month"}
													</span>
												</>
											)}
										</div>
									</div>

									{hasUsage && "addonsDescription" in plan && (
										<div className="mb-6 rounded bg-muted/50 p-3">
											<p className="mb-1 font-bold font-mono text-xs uppercase tracking-wider">
												Base inclusions +
											</p>
											<p className="text-muted-foreground text-xs italic">
												{plan.addonsDescription?.join(" • ")}
											</p>
										</div>
									)}

									<ul className="mb-10 flex-1 space-y-4">
										{plan.features.map((feature, index) => (
											<li
												key={`${key}-${index}-${feature}`}
												className="flex items-start gap-3 text-sm"
											>
												<div className="center mt-0.5 flex size-4 shrink-0 rounded-sm bg-primary/10 text-primary">
													<Check className="size-3" />
												</div>
												<span className="text-muted-foreground">{feature}</span>
											</li>
										))}
									</ul>

									<Button
										asChild
										variant={isPopular ? "default" : "outline"}
										className="h-12 font-bold"
									>
										<Link
											to={
												isEnterprise
													? "/contact"
													: `/signup?plan=${key}${interval === "yearly" ? "&interval=yearly" : ""}`
											}
										>
											{plan.cta}
										</Link>
									</Button>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* FAQs */}
			<MarketingContainer className="border-border/40 border-y bg-muted/20 py-24">
				<div className="mx-auto max-w-4xl">
					<div className="mb-16 text-center">
						<Badge
							variant="outline"
							className="mx-auto mb-4 rounded-full border-primary/30 px-4 py-1.5 font-bold font-mono text-primary text-xs uppercase tracking-widest"
						>
							FAQ
						</Badge>
						<MarketingHeading className="mb-4">
							Still have questions?
						</MarketingHeading>
						<p className="text-muted-foreground">
							Everything you need to know about pricing and getting started.
						</p>
					</div>
					<FAQ items={faqs} />
				</div>
			</MarketingContainer>

			<MarketingCTA />
		</>
	);
}
