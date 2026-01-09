import { Building2, Check, Plus, ShieldCheck, Users, Zap } from "lucide-react";
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
			"Simple, transparent pricing. No hidden fees. No surprises. Start for free and scale as you grow.",
	},
];

const faqs = [
	{
		q: "Can I change my plan later?",
		a: "Absolutely. You can upgrade or downgrade your plan at any time directly through your dashboard. If you upgrade, the new features are available immediately, and we'll pro-rate the difference. Downgrades take effect at the start of your next billing cycle.",
	},
	{
		q: "Is there really a free version?",
		a: "Yes. Our Starter plan is genuinely free for small teams of up to 10 members. It's not a trial—it's a way for you to build your foundation without worry.",
	},
	{
		q: "What payment methods do you accept?",
		a: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment partner, Dodo Payments. For Enterprise customers, we also support bank transfers and custom invoicing.",
	},
	{
		q: "How secure is my data?",
		a: "Security is our top priority. We use industry-standard AES-256 encryption for data at rest and TLS 1.2+ for data in transit. We are SOC2 compliant and perform regular third-party security audits.",
	},
	{
		q: "What happens if I exceed my usage limits?",
		a: "For Growth and Pro plans, we provide a generous base of inclusions. If you go over, you'll be charged at our standard metered rates at the end of the month. We'll always notify you when you reach 80% and 100% of your limits.",
	},
	{
		q: "Do you offer discounts for non-profits?",
		a: "We love supporting organizations that do good. Registered non-profits and educational institutions are eligible for a 50% discount on all annual plans. Reach out to our support team to get started.",
	},
	{
		q: "Can I cancel my subscription at any time?",
		a: "Yes, you can cancel your subscription whenever you like. You'll continue to have access to your paid features until the end of your current billing period, after which your account will revert to the Starter plan.",
	},
	{
		q: "What kind of support can I expect?",
		a: "All plans include access to our documentation and community forums. Growth and Pro plans include priority email support with a 24-hour response time, while Enterprise customers receive a dedicated account manager and 24/7 phone support.",
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
			<section className="bg-muted/30 py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-4xl">
						<div className="mb-20">
							<Badge
								variant="outline"
								className="mb-4 rounded-full border-primary/30 px-4 py-1.5 font-bold font-mono text-primary text-xs uppercase tracking-widest"
							>
								Support & FAQ
							</Badge>
							<h2 className="font-medium font-serif text-5xl tracking-tight md:text-6xl">
								Got{" "}
								<span className="text-muted-foreground italic">questions?</span>
								<br />
								We've got answers.
							</h2>
						</div>
						<div className="border-border/60 border-t">
							{faqs.map((faq) => (
								<FAQItem key={faq.q} {...faq} />
							))}
						</div>
					</div>
				</div>
			</section>

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
