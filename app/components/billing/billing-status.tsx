import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { ProductKey } from "~/lib/billing/plans";
import { planLimits } from "~/lib/billing/plans";

interface BillingStatusProps {
	plan: ProductKey;
	currentUsage: {
		members: number;
		teams: number;
		matters: number;
		storageGb: number;
	};
	limits?: (typeof planLimits)[ProductKey];
	className?: string;
}

export function BillingStatus({
	plan,
	currentUsage,
	limits,
	className,
}: BillingStatusProps) {
	const effectiveLimits = limits ?? planLimits[plan];

	const isUnlimited = (limit: number) => limit === -1;
	const isOverLimit = (current: number, limit: number) =>
		!isUnlimited(limit) && current > limit;

	const getStatusColor = () => {
		const memberOver = isOverLimit(
			currentUsage.members,
			effectiveLimits.members,
		);
		const teamOver = isOverLimit(currentUsage.teams, effectiveLimits.teams);
		const matterOver = isOverLimit(
			currentUsage.matters,
			effectiveLimits.matters,
		);
		const storageOver = isOverLimit(
			currentUsage.storageGb,
			effectiveLimits.storageGb,
		);

		if (memberOver || teamOver || matterOver || storageOver)
			return "destructive";
		return "default";
	};

	const getStatusText = () => {
		const memberOver = isOverLimit(
			currentUsage.members,
			effectiveLimits.members,
		);
		const teamOver = isOverLimit(currentUsage.teams, effectiveLimits.teams);
		const matterOver = isOverLimit(
			currentUsage.matters,
			effectiveLimits.matters,
		);
		const storageOver = isOverLimit(
			currentUsage.storageGb,
			effectiveLimits.storageGb,
		);

		if (memberOver || teamOver || matterOver || storageOver)
			return "Over limit";
		return "Within limit";
	};

	const _getUsagePercentage = (current: number, limit: number): number => {
		if (isUnlimited(limit)) return 0;
		const percentage = (current / limit) * 100;
		return Math.min(100, Math.round(percentage));
	};

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{plan} Plan</CardTitle>
					<Badge variant={getStatusColor()}>{getStatusText()}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 text-sm">
					<span className="text-muted-foreground">Members</span>
					<span className="font-medium">{currentUsage.members}</span>
					<span className="text-muted-foreground">
						{isUnlimited(effectiveLimits.members)
							? "/"
							: `/ ${effectiveLimits.members}`}
					</span>

					<span className="text-muted-foreground">Teams</span>
					<span className="font-medium">{currentUsage.teams}</span>
					<span className="text-muted-foreground">
						{isUnlimited(effectiveLimits.teams)
							? "/"
							: `/ ${effectiveLimits.teams}`}
					</span>

					<span className="text-muted-foreground">Matters</span>
					<span className="font-medium">{currentUsage.matters}</span>
					<span className="text-muted-foreground">
						{isUnlimited(effectiveLimits.matters)
							? "/"
							: `/ ${effectiveLimits.matters}`}
					</span>

					<span className="text-muted-foreground">Storage</span>
					<span className="font-medium">
						{Math.round(currentUsage.storageGb * 10) / 10} GB
					</span>
					<span className="text-muted-foreground">
						{isUnlimited(effectiveLimits.storageGb)
							? "/"
							: `/ ${effectiveLimits.storageGb} GB`}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

export type { BillingStatusProps };
