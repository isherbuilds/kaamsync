import { Check, HelpCircle } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
	{ title: "Pricing - KaamSync" },
	{
		name: "description",
		content:
			"Simple, transparent pricing for teams of all sizes. Start free, upgrade when you're ready.",
	},
];

const plans = [
	{
		name: "Free",
		price: "$0",
		period: "forever",
		description:
			"For small teams getting started with structured task management.",
		features: [
			"Up to 5 team members",
			"Unlimited tasks",
			"Basic workspaces",
			"7-day activity history",
			"Email support",
		],
		cta: "Get Started",
		href: "/signup",
		popular: false,
	},
	{
		name: "Pro",
		price: "$12",
		period: "per user / month",
		description:
			"For growing teams that need advanced workflows and reporting.",
		features: [
			"Unlimited team members",
			"Unlimited tasks",
			"Advanced workspaces",
			"Unlimited history",
			"Priority support",
			"Custom fields",
			"Approval workflows",
			"API access",
			"Integrations",
		],
		cta: "Start Free Trial",
		href: "/signup?plan=pro",
		popular: true,
	},
	{
		name: "Enterprise",
		price: "Custom",
		period: "contact us",
		description:
			"For large organizations with specific security and compliance needs.",
		features: [
			"Everything in Pro",
			"SSO / SAML",
			"Advanced security",
			"Dedicated support",
			"Custom integrations",
			"SLA guarantee",
			"Onboarding assistance",
			"Custom contracts",
		],
		cta: "Contact Sales",
		href: "/contact",
		popular: false,
	},
];

const faqs = [
	{
		q: "Can I change plans later?",
		a: "Yes, you can upgrade or downgrade anytime. Changes take effect on your next billing cycle.",
	},
	{
		q: "What payment methods do you accept?",
		a: "All major credit cards. Enterprise customers can arrange invoicing.",
	},
	{
		q: "Is there a free trial for Pro?",
		a: "Yes — 14 days free, no credit card required. Cancel anytime.",
	},
	{
		q: "What happens if I downgrade?",
		a: "Your data stays safe. Some features become read-only until you upgrade again.",
	},
	{
		q: "Do you offer discounts for nonprofits?",
		a: "Yes, we offer 50% off for registered nonprofits. Contact us to apply.",
	},
	{
		q: "Can I get a refund?",
		a: "We offer a 30-day money-back guarantee for annual plans.",
	},
];

export default function PricingPage() {
	return (
		<>
			{/* Hero */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<p className="text-sm font-medium text-primary mb-4">Pricing</p>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
							Simple pricing for
							<br />
							every team size
						</h1>
						<p className="text-lg text-muted-foreground">
							Start free and scale as you grow. No hidden fees, no surprises.
						</p>
					</div>

					{/* Plans */}
					<div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
						{plans.map((plan) => (
							<div
								key={plan.name}
								className={`relative rounded-2xl border bg-card/30 backdrop-blur-sm p-8 ${plan.popular ? "border-primary/50 bg-card/50 shadow-lg shadow-primary/5" : "border-border/60"}`}
							>
								{plan.popular && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
											Most Popular
										</span>
									</div>
								)}
								<div className="mb-6">
									<h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
									<p className="text-sm text-muted-foreground">
										{plan.description}
									</p>
								</div>
								<div className="mb-6">
									<span className="text-4xl font-bold">{plan.price}</span>
									<span className="text-muted-foreground ml-1">
										/{plan.period}
									</span>
								</div>
								<Button
									asChild
									className={`w-full rounded-lg h-10 mb-6 ${plan.popular ? "bg-foreground text-background hover:bg-foreground/90" : ""}`}
									variant={plan.popular ? "default" : "outline"}
								>
									<Link to={plan.href}>{plan.cta}</Link>
								</Button>
								<ul className="space-y-3">
									{plan.features.map((feature) => (
										<li
											key={feature}
											className="flex items-start gap-2 text-sm"
										>
											<Check className="size-4 text-primary shrink-0 mt-0.5" />
											<span className="text-muted-foreground">{feature}</span>
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQs */}
			<section className="py-24 md:py-32 border-t border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="text-center mb-16">
						<div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-6">
							<HelpCircle className="size-3.5" />
							<span>FAQ</span>
						</div>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight">
							Frequently asked questions
						</h2>
					</div>
					<div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
						{faqs.map(({ q, a }) => (
							<div
								key={q}
								className="rounded-xl border border-border/60 bg-card/30 backdrop-blur-sm p-6"
							>
								<h3 className="font-medium mb-2">{q}</h3>
								<p className="text-sm text-muted-foreground">{a}</p>
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
								Still have questions?
							</h2>
							<p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
								Our team is here to help. Reach out and we'll get back to you
								within 24 hours.
							</p>
							<Button
								size="lg"
								className="h-11 px-8 rounded-lg bg-foreground text-background hover:bg-foreground/90"
								asChild
							>
								<Link to="/contact">Contact Sales</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
