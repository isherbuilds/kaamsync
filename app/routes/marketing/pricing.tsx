import { Building2, Check, Mail, ShieldCheck, Users, Zap } from "lucide-react";
import { useState } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { type BillingInterval, type ProductKey, products } from "~/lib/billing";
import { cn } from "~/lib/utils";

export const meta: MetaFunction = () => [
	{ title: "Pricing - KaamSync" },
	{
		name: "description",
		content:
			"Simple, transparent pricing for teams of all sizes. Start for free.",
	},
	{
		q: "Can I change my plan later?",
		a: "Yes, you can upgrade or downgrade at any time via your organization settings. Changes are reflected in your next billing cycle.",
	},
	{
		q: "What payment methods do you accept?",
		a: "We accept all major credit cards via Dodo Payments. Invoicing is available for Enterprise customers.",
	},
	{
		q: "How does metered billing work?",
		a: "For Growth and Pro plans, we include a generous base of members and storage. If you exceed these, you'll be billed for the additional usage at the end of your cycle.",
	},
	{
		q: "Is there a limit on teams?",
		a: "The Starter plan allows up to 5 teams. Growth and Enterprise plans offer unlimited team creation.",
	},
];

const planIcons: Record<ProductKey, React.ReactNode> = {
	starter: <Users className="h-5 w-5" />,
	growth: <Zap className="h-5 w-5" />,
	pro: <ShieldCheck className="h-5 w-5" />,
	enterprise: <Building2 className="h-5 w-5" />,
};

const planDescriptions: Record<ProductKey, string> = {
	starter: "For small teams getting started.",
	growth: "For growing teams ready to scale.",
	pro: "For established teams that need more control.",
	enterprise: "For large organizations managing multiple sites.",
};

export default function PricingPage() {
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const planKeys: ProductKey[] = ["starter", "growth", "pro", "enterprise"];

	return (
		<>
			{/* Hero */}
			<section className="bg-background py-24 text-center">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-3xl">
						<h1 className="mb-6 font-medium font-serif text-5xl tracking-tight md:text-7xl">
							Simple, transparent <br />{" "}
							<span className="text-muted-foreground italic">pricing.</span>
						</h1>
						<p className="mb-10 text-muted-foreground text-xl">
							No hidden fees. No surprises. Start for free and scale as you
							grow.
						</p>

						{/* Billing Toggle */}
						<div className="flex items-center justify-center">
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
											className="rounded bg-primary/10 text-primary"
										>
											{/* 2 Months Free */}
											Discount
										</Badge>
									</TabsTrigger>
								</TabsList>
							</Tabs>
						</div>
					</div>
				</div>
			</section>

			{/* Plans */}
			<section className="relative bg-background pb-24">
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
							const hasUsage = "usageBased" in plan && plan.usageBased;

							return (
								<div
									key={key}
									className={cn(
										"relative flex flex-col bg-background p-8 transition-all duration-300",
										isPopular && "z-10 ring-2 ring-primary",
									)}
								>
									{isPopular && (
										<div className="absolute top-0 right-1/2 left-1/2 -mt-3 w-max -translate-x-1/2">
											<span className="bg-primary px-3 py-1 font-bold font-mono text-[10px] text-primary-foreground uppercase tracking-widest shadow-sm">
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
															${originalYearly / 100}
														</span>
													)}
													<span className="font-bold font-sans text-4xl">
														${price / 100}
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
											<p className="mb-1 font-bold font-mono text-[10px] uppercase tracking-wider">
												Base inclusions +
											</p>
											<p className="text-muted-foreground text-xs italic">
												{plan.addonsDescription?.join(" • ")}
											</p>
										</div>
									)}

									<ul className="mb-10 flex-1 space-y-4">
										{plan.features.map((feature) => (
											<li
												key={feature}
												className="flex items-start gap-3 text-sm"
											>
												<div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
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
			<section className="border-border/40 border-t bg-muted/20 py-24">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mb-16 text-center">
						<h2 className="mb-4 font-bold text-3xl">
							Frequently Asked Questions
						</h2>
					</div>
					<div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
						{faqs.map(({ q, a }) => (
							<div
								key={q}
								className="rounded-lg border border-border bg-background p-8 shadow-sm"
							>
								<h3 className="mb-3 font-bold text-lg">{q}</h3>
								<p className="text-muted-foreground leading-relaxed">{a}</p>
							</div>
						))}
					</div>
					<FAQ items={faqs} />
				</div>
			</MarketingContainer>

			{/* CTA */}
			<section className="bg-foreground py-24 text-center text-background">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 font-medium font-serif text-4xl tracking-tight md:text-5xl">
						Still have questions?
					</h2>
					<p className="mx-auto mb-12 max-w-lg text-background/70 text-lg">
						Our support team is standing by to help you choose the right plan
						for your business.
					</p>
					<Button
						size="lg"
						className="h-14 bg-primary px-10 font-bold text-lg text-primary-foreground hover:bg-primary/90"
						asChild
					>
						<Link to="/contact">Contact Sales</Link>
					</Button>
				</div>
			</section>
		</>
	);
}
