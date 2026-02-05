import Check from "lucide-react/dist/esm/icons/check";
import Mail from "lucide-react/dist/esm/icons/mail";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Users from "lucide-react/dist/esm/icons/users";
import Zap from "lucide-react/dist/esm/icons/zap";
import { useState } from "react";
import { Form } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	type BillingInterval,
	canCheckout,
	getMonthlyEquivalent,
	getPrice,
	getYearlySavings,
	type ProductKey,
	products,
} from "~/config/billing";
import { cn } from "~/lib/utils";

const planDescriptions: Record<ProductKey, string> = {
	starter: "Free forever for small teams up to 3 members",
	growth: "For teams ready to unify their operations",
	pro: "For scaling organizations requiring maximum control",
	enterprise: "Customized infrastructure for large-scale operations",
};

const planIcons: Record<ProductKey, React.ReactNode> = {
	starter: <Users className="size-5" />,
	growth: <Zap className="size-5" />,
	pro: <Sparkles className="size-5" />,
	enterprise: <Mail className="size-5" />,
};

interface PlanCardProps {
	plan: ProductKey;
	interval: BillingInterval;
	currentPlan?: string | null;
	loading?: boolean;
}

function PlanCard({ plan, interval, currentPlan, loading }: PlanCardProps) {
	const product = products[plan];
	const isCurrentPlan =
		currentPlan === plan || (plan === "starter" && !currentPlan);
	const isPopular = product.popular;
	const isEnterprise = plan === "enterprise";
	const hasAddons = "hasAddons" in product && product.hasAddons;

	const price = getPrice(plan, interval);
	const monthlyPrice = product.monthlyPrice;
	const yearlyPrice = product.yearlyPrice;

	const displayPrice =
		interval === "yearly" && yearlyPrice
			? getMonthlyEquivalent(yearlyPrice)
			: monthlyPrice;

	const savings =
		monthlyPrice && yearlyPrice
			? getYearlySavings(monthlyPrice, yearlyPrice)
			: 0;

	const getButtonText = () => {
		if (isCurrentPlan) return "Current Plan";
		if (isEnterprise) return product.cta;
		if (plan === "starter") return "Downgrade";
		return product.cta;
	};

	const getButtonVariant = () => {
		if (isCurrentPlan) return "outline";
		if (isPopular) return "default";
		if (isEnterprise) return "secondary";
		return "outline";
	};

	const isDisabled =
		isCurrentPlan ||
		loading ||
		(!isEnterprise && !canCheckout(plan) && plan !== "starter");

	return (
		<div
			className={cn(
				"v-stack relative rounded border bg-card p-6",
				isPopular && "border-primary",
				isEnterprise && "border-dashed",
			)}
		>
			{isPopular && (
				<div className="absolute -top-3 left-1/2 -translate-x-1/2">
					<Badge className="bg-primary px-3 py-1 text-primary-foreground">
						Most Popular
					</Badge>
				</div>
			)}
			<div className="mb-4 pb-4">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"rounded-lg p-2",
							isPopular ? "bg-primary/10" : "bg-muted",
						)}
					>
						{planIcons[plan]}
					</div>
					<div className="font-semibold text-xl">{product.name}</div>
				</div>
				<div className="mt-2 min-h-10 text-muted-foreground text-sm">
					{planDescriptions[plan]}
				</div>
			</div>
			<div className="flex-1 space-y-4">
				{/* Pricing */}
				<div className="flex items-baseline gap-1">
					{price === null ? (
						<span className="font-bold text-3xl">Custom</span>
					) : !displayPrice || displayPrice === 0 ? (
						<span className="font-bold text-4xl">Free</span>
					) : (
						<>
							<span className="font-bold text-4xl">${displayPrice / 100}</span>
							<span className="text-muted-foreground text-sm">/month</span>
						</>
					)}
				</div>

				{/* Yearly savings badge */}
				{interval === "yearly" && savings > 0 && plan !== "starter" && (
					<Badge variant="secondary" className="text-xs">
						Save {savings}% with yearly billing
					</Badge>
				)}

				{/* Billed yearly note */}
				{interval === "yearly" && yearlyPrice && yearlyPrice > 0 && (
					<p className="text-muted-foreground text-xs">
						${yearlyPrice / 100} billed yearly
					</p>
				)}

				{/* Usage-based pricing for Growth/Pro */}
				{hasAddons && "addonsDescription" in product && (
					<div className="space-y-1">
						<Badge variant="outline" className="text-xs">
							Usage-based overages
						</Badge>
						<div className="text-muted-foreground text-xs">
							{product.addonsDescription?.join(" • ")}
						</div>
					</div>
				)}

				{/* Features */}
				<ul className="space-y-2.5">
					{product.features.map((feature) => (
						<li key={feature} className="flex items-start gap-2.5 text-sm">
							<Check className="mt-0.5 size-4 shrink-0 text-green-500" />
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</div>
			<div className="mt-4 pt-4">
				{isEnterprise ? (
					<Button
						className="w-full"
						variant={getButtonVariant()}
						size="lg"
						disabled={isDisabled}
						asChild
					>
						<a href="mailto:sales@kaamsync.com?subject=Enterprise%20Plan%20Inquiry">
							{getButtonText()}
						</a>
					</Button>
				) : (
					<Form method="post" className="w-full">
						<input type="hidden" name="intent" value="checkout" />
						<input type="hidden" name="plan" value={plan} />
						<input type="hidden" name="interval" value={interval} />
						<Button
							type="submit"
							className="w-full"
							variant={getButtonVariant()}
							size="lg"
							disabled={isDisabled}
						>
							{loading ? "Processing..." : getButtonText()}
						</Button>
					</Form>
				)}
			</div>
		</div>
	);
}

interface PricingGridProps {
	currentPlan?: string | null;
	loading?: boolean;
	defaultInterval?: BillingInterval;
}

export function PricingGrid({
	currentPlan,
	loading,
	defaultInterval = "monthly",
}: PricingGridProps) {
	const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
	const plans: ProductKey[] = ["starter", "growth", "pro", "enterprise"];

	return (
		<div className="space-y-8">
			{/* Billing Toggle */}
			<div className="center flex">
				<Tabs
					value={interval}
					onValueChange={(value) => setInterval(value as BillingInterval)}
				>
					<TabsList className="grid w-72 grid-cols-2">
						<TabsTrigger value="monthly">Monthly</TabsTrigger>
						<TabsTrigger value="yearly" className="relative">
							Yearly
							<Badge variant="secondary" className="ml-2 text-xs">
								-17%
							</Badge>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* Plan Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{plans.map((plan) => (
					<PlanCard
						key={plan}
						plan={plan}
						interval={interval}
						currentPlan={currentPlan}
						loading={loading}
					/>
				))}
			</div>
		</div>
	);
}

// Compact pricing table for comparison
export function PricingComparison() {
	const features = [
		{
			name: "Team members",
			starter: "3",
			growth: "10",
			pro: "25",
			enterprise: "Unlimited",
		},
		{
			name: "Teams",
			starter: "5",
			growth: "Unlimited",
			pro: "Unlimited",
			enterprise: "Unlimited",
		},
		{
			name: "Storage",
			starter: "500MB",
			growth: "10GB",
			pro: "25GB",
			enterprise: "Unlimited",
		},
		{
			name: "Matter management",
			starter: "Basic",
			growth: "Advanced",
			pro: "Advanced",
			enterprise: "Custom",
		},
		{
			name: "Workflows",
			starter: "—",
			growth: "✓",
			pro: "Custom",
			enterprise: "Custom",
		},
		{
			name: "Analytics",
			starter: "—",
			growth: "Basic",
			pro: "Advanced",
			enterprise: "Custom",
		},
		{
			name: "API access",
			starter: "—",
			growth: "—",
			pro: "✓",
			enterprise: "✓",
		},
		{
			name: "SSO/SAML",
			starter: "—",
			growth: "—",
			pro: "—",
			enterprise: "✓",
		},
		{
			name: "Support",
			starter: "Email",
			growth: "Priority",
			pro: "Priority",
			enterprise: "24/7 Dedicated",
		},
		{ name: "SLA", starter: "—", growth: "—", pro: "—", enterprise: "✓" },
	];

	const usageOverages = [
		{
			name: "Extra member",
			starter: "—",
			growth: "$5/member",
			pro: "$4/member",
			enterprise: "Custom",
		},
		{
			name: "Extra team",
			starter: "—",
			growth: "$3/team",
			pro: "$2/team",
			enterprise: "Custom",
		},
		{
			name: "Extra storage",
			starter: "—",
			growth: "$2/GB",
			pro: "$1/GB",
			enterprise: "Custom",
		},
	];

	return (
		<div className="space-y-8">
			{/* Feature Comparison */}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="py-3 pr-4 text-left font-medium">Feature</th>
							<th className="px-4 py-3 text-center font-medium">Starter</th>
							<th className="px-4 py-3 text-center font-medium">
								<span className="text-primary">Growth</span>
							</th>
							<th className="px-4 py-3 text-center font-medium">
								Professional
							</th>
							<th className="px-4 py-3 text-center font-medium">Enterprise</th>
						</tr>
					</thead>
					<tbody>
						{features.map((feature) => (
							<tr key={feature.name} className="border-b">
								<td className="py-3 pr-4 font-medium">{feature.name}</td>
								<td className="px-4 py-3 text-center text-muted-foreground">
									{feature.starter}
								</td>
								<td className="px-4 py-3 text-center">{feature.growth}</td>
								<td className="px-4 py-3 text-center">{feature.pro}</td>
								<td className="px-4 py-3 text-center">{feature.enterprise}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Usage-Based Overages */}
			<div className="overflow-x-auto">
				<h4 className="mb-4 font-medium">Usage-Based Overages</h4>
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b">
							<th className="py-3 pr-4 text-left font-medium">Overage Type</th>
							<th className="px-4 py-3 text-center font-medium">Starter</th>
							<th className="px-4 py-3 text-center font-medium">
								<span className="text-primary">Growth</span>
							</th>
							<th className="px-4 py-3 text-center font-medium">
								Professional
							</th>
							<th className="px-4 py-3 text-center font-medium">Enterprise</th>
						</tr>
					</thead>
					<tbody>
						{usageOverages.map((overage) => (
							<tr key={overage.name} className="border-b">
								<td className="py-3 pr-4 font-medium">{overage.name}</td>
								<td className="px-4 py-3 text-center text-muted-foreground">
									{overage.starter}
								</td>
								<td className="px-4 py-3 text-center">{overage.growth}</td>
								<td className="px-4 py-3 text-center">{overage.pro}</td>
								<td className="px-4 py-3 text-center">{overage.enterprise}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
