import { Check, Mail, Sparkles, Users, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
	type BillingInterval,
	canCheckout,
	getMonthlyEquivalent,
	getPrice,
	getYearlySavings,
	type ProductKey,
	products,
} from "~/lib/billing";
import { cn } from "~/lib/utils";

interface PlanCardProps {
	plan: ProductKey;
	interval: BillingInterval;
	currentPlan?: string | null;
	onSelect: (plan: ProductKey, interval: BillingInterval) => void;
	onContactSales?: () => void;
	loading?: boolean;
}

const planDescriptions: Record<ProductKey, string> = {
	starter: "Perfect for individuals and small teams getting started",
	growth: "For growing teams that need more power and flexibility",
	pro: "For established teams requiring advanced features",
	enterprise: "For large organizations with custom requirements",
};

const planIcons: Record<ProductKey, React.ReactNode> = {
	starter: <Users className="h-5 w-5" />,
	growth: <Zap className="h-5 w-5" />,
	pro: <Sparkles className="h-5 w-5" />,
	enterprise: <Mail className="h-5 w-5" />,
};

export function PlanCard({
	plan,
	interval,
	currentPlan,
	onSelect,
	onContactSales,
	loading,
}: PlanCardProps) {
	const product = products[plan];
	const isCurrentPlan =
		currentPlan === plan || (plan === "starter" && !currentPlan);
	const isPopular = product.popular;
	const isEnterprise = plan === "enterprise";
	const hasAddons = "usageBased" in product && product.usageBased;

	const price = getPrice(plan, interval);
	const monthlyPrice = product.monthlyPrice;
	const yearlyPrice = product.yearlyPrice;

	// Calculate display price
	const displayPrice =
		interval === "yearly" && yearlyPrice
			? getMonthlyEquivalent(yearlyPrice)
			: monthlyPrice;

	const savings =
		monthlyPrice && yearlyPrice
			? getYearlySavings(monthlyPrice, yearlyPrice)
			: 0;

	const handleClick = () => {
		if (isEnterprise && onContactSales) {
			onContactSales();
		} else {
			onSelect(plan, interval);
		}
	};

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

	return (
		<Card
			className={cn(
				"relative flex flex-col transition-all duration-200 hover:shadow-lg",
				isPopular && "scale-[1.02] border-primary shadow-md",
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
			<CardHeader className="pb-4">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"rounded-lg p-2",
							isPopular ? "bg-primary/10" : "bg-muted",
						)}
					>
						{planIcons[plan]}
					</div>
					<CardTitle className="text-xl">{product.name}</CardTitle>
				</div>
				<CardDescription className="mt-2 min-h-10">
					{planDescriptions[plan]}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 space-y-4">
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
							<Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							<span>{feature}</span>
						</li>
					))}
				</ul>
			</CardContent>
			<CardFooter className="pt-4">
				<Button
					className="w-full"
					variant={getButtonVariant()}
					size="lg"
					disabled={
						isCurrentPlan ||
						loading ||
						(!isEnterprise && !canCheckout(plan) && plan !== "starter")
					}
					onClick={handleClick}
				>
					{loading ? "Processing..." : getButtonText()}
				</Button>
			</CardFooter>
		</Card>
	);
}

interface PricingGridProps {
	currentPlan?: string | null;
	onSelectPlan: (plan: ProductKey, interval: BillingInterval) => void;
	onContactSales?: () => void;
	loading?: boolean;
	defaultInterval?: BillingInterval;
}

export function PricingGrid({
	currentPlan,
	onSelectPlan,
	onContactSales,
	loading,
	defaultInterval = "monthly",
}: PricingGridProps) {
	const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
	const plans: ProductKey[] = ["starter", "growth", "pro", "enterprise"];

	const handleContactSales = () => {
		if (onContactSales) {
			onContactSales();
		} else {
			window.location.href =
				"mailto:sales@kaamsync.com?subject=Enterprise%20Plan%20Inquiry";
		}
	};

	return (
		<div className="space-y-8">
			{/* Billing Toggle */}
			<div className="flex items-center justify-center">
				<Tabs
					value={interval}
					onValueChange={(value) => setInterval(value as BillingInterval)}
				>
					<TabsList className="grid w-75 grid-cols-2">
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
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				{plans.map((plan) => (
					<PlanCard
						key={plan}
						plan={plan}
						interval={interval}
						currentPlan={currentPlan}
						onSelect={onSelectPlan}
						onContactSales={handleContactSales}
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
			pro: "15",
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
