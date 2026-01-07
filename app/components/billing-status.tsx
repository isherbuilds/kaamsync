import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface BillingStatusProps {
	plan: string;
	currentMembers: number;
	planLimit: number;
	className?: string;
}

export function BillingStatus({
	plan,
	currentMembers,
	planLimit,
	className,
}: BillingStatusProps) {
	const isUnlimited = planLimit === -1;
	const isOverLimit = !isUnlimited && currentMembers > planLimit;
	const isNearLimit = !isUnlimited && currentMembers >= planLimit * 0.8;

	const getStatusColor = () => {
		if (isUnlimited) return "default";
		if (isOverLimit) return "destructive";
		if (isNearLimit) return "secondary";
		return "default";
	};

	const getStatusText = () => {
		if (isUnlimited) return "Unlimited";
		if (isOverLimit) return "Over limit";
		if (isNearLimit) return "Near limit";
		return "Within limit";
	};

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center justify-between text-base">
					<span className="capitalize">{plan} Plan</span>
					<Badge variant={getStatusColor()}>{getStatusText()}</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Team Members</span>
					<span className="font-medium">
						{currentMembers}
						{!isUnlimited && `/${planLimit}`}
					</span>
				</div>

				{!isUnlimited && (
					<div className="w-full bg-secondary rounded-full h-2">
						<div
							className={`h-2 rounded-full transition-all ${
								isOverLimit
									? "bg-destructive"
									: isNearLimit
										? "bg-yellow-500"
										: "bg-primary"
							}`}
							style={{
								width: `${Math.min((currentMembers / planLimit) * 100, 100)}%`,
							}}
						/>
					</div>
				)}

				{plan !== "enterprise" && (
					<p className="text-muted-foreground text-xs">
						Additional members: $5 each
					</p>
				)}
			</CardContent>
		</Card>
	);
}