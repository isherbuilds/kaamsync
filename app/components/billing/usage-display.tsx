import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import HardDrive from "lucide-react/dist/esm/icons/hard-drive";
import Layers from "lucide-react/dist/esm/icons/layers";
import Users from "lucide-react/dist/esm/icons/users";
import { Progress } from "~/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import {
	addonPricing,
	type ProductKey,
	planLimits,
	products,
} from "~/config/billing";
import { cn } from "~/lib/utils";

interface UsageData {
	members: number;
	teams: number;
	matters?: number;
	storageGb?: number;
}

interface UsageDisplayProps {
	usage: UsageData;
	currentPlan: ProductKey | null;
}

interface UsageItemProps {
	label: string;
	current: number;
	limit: number;
	icon: React.ElementType;
	unit?: string;
	overageRate?: number | null;
	formatValue?: (value: number) => string;
}

function UsageItem({
	label,
	current,
	limit,
	icon: Icon,
	unit = "",
	overageRate,
	formatValue,
}: UsageItemProps) {
	const isUnlimited = limit === -1;
	const percentage =
		isUnlimited || limit === 0 ? 0 : Math.min((current / limit) * 100, 100);
	const isOverLimit = !isUnlimited && current > limit;
	const isNearLimit = !isUnlimited && percentage >= 80;
	const overage = isOverLimit ? current - limit : 0;

	const displayValue = formatValue ? formatValue(current) : current.toString();
	const displayLimit = isUnlimited
		? "Unlimited"
		: formatValue
			? formatValue(limit)
			: limit.toString();

	return (
		<div className="v-stack gap-2">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon
						className={cn("h-4 w-4", {
							"text-red-500": isOverLimit,
							"text-amber-500": isNearLimit && !isOverLimit,
							"text-muted-foreground": !isNearLimit && !isOverLimit,
						})}
					/>
					<span className="font-medium text-sm">{label}</span>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={cn("text-sm", {
							"font-semibold text-red-500": isOverLimit,
							"text-amber-500": isNearLimit && !isOverLimit,
							"text-muted-foreground": !isNearLimit && !isOverLimit,
						})}
					>
						{displayValue}
						{unit} / {displayLimit}
						{!isUnlimited && unit}
					</span>
					{isOverLimit && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<AlertTriangle className="h-4 w-4 text-red-500" />
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Over limit by {overage}
										{unit}.{" "}
										{overageRate &&
											`Overage charge: $${((overage * overageRate) / 100).toFixed(2)}`}
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</div>
			{!isUnlimited && (
				<Progress
					value={percentage}
					className={cn("h-2", {
						"[&>div]:bg-red-500": isOverLimit,
						"[&>div]:bg-amber-500": isNearLimit && !isOverLimit,
					})}
				/>
			)}
			{isUnlimited && (
				<div className="h-2 rounded-full bg-muted">
					<div className="h-full w-full rounded-full bg-green-500/20" />
				</div>
			)}
		</div>
	);
}

function AddonPricingInfo({ planKey }: { planKey: ProductKey }) {
	if (planKey === "starter" || planKey === "enterprise") {
		return null;
	}

	const pricing = addonPricing[planKey as keyof typeof addonPricing];
	if (!pricing) return null;

	return (
		<div className="rounded-lg border border-dashed bg-muted/30 p-3">
			<p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				Add-on Pricing
			</p>
			<div className="grid grid-cols-2 gap-2 text-sm">
				<div className="text-center">
					<p className="font-semibold">
						${(pricing.seatCents / 100).toFixed(0)}
					</p>
					<p className="text-muted-foreground text-xs">per extra member</p>
				</div>
				<div className="text-center">
					<p className="font-semibold">
						${(pricing.storageGbCents / 100).toFixed(0)}
					</p>
					<p className="text-muted-foreground text-xs">per GB storage</p>
				</div>
			</div>
		</div>
	);
}

export function UsageDisplay({ usage, currentPlan }: UsageDisplayProps) {
	const planKey = currentPlan ?? "starter";
	const limits = planLimits[planKey];
	const product = products[planKey];

	// Get addon pricing if applicable
	const pricing =
		planKey !== "starter" && planKey !== "enterprise"
			? addonPricing[planKey as keyof typeof addonPricing]
			: null;

	const isFrozen = usage.members > limits.members && limits.members !== -1;
	const isMattersFrozen =
		usage.matters && limits.matters !== -1 && usage.matters >= limits.matters;

	return (
		<div className="rounded-xl border bg-card p-6 shadow-sm">
			<div className="mb-4">
				<div className="flex items-center justify-between font-semibold text-lg">
					<span>Current Usage</span>
					<span className="font-normal text-muted-foreground text-sm">
						{product.name} Plan
					</span>
				</div>
			</div>
			<div className="space-y-4">
				{(isFrozen || isMattersFrozen) && (
					<div className="rounded-md bg-destructive/15 p-3 font-medium text-destructive text-sm">
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-4 w-4" />
							<span>
								Usage limits exceeded. Creating new items is blocked until you
								upgrade.
							</span>
						</div>
					</div>
				)}

				<UsageItem
					label="Team Members"
					current={usage.members}
					limit={limits.members}
					icon={Users}
					overageRate={pricing?.seatCents}
				/>

				<UsageItem
					label="Teams"
					current={usage.teams}
					limit={limits.teams}
					icon={Layers}
				/>

				<UsageItem
					label="Tasks & Requests"
					current={usage.matters ?? 0}
					limit={limits.matters ?? -1}
					icon={Layers}
				/>

				<UsageItem
					label="Storage"
					current={usage.storageGb ?? 0}
					limit={limits.storageGb}
					icon={HardDrive}
					unit="GB"
					overageRate={pricing?.storageGbCents}
					formatValue={(val) =>
						val < 1 ? `${Math.round(val * 1000)}MB` : `${val.toFixed(1)}GB`
					}
				/>

				{/* Show addon pricing info for plans with add-ons */}
				{product.hasAddons ? <AddonPricingInfo planKey={planKey} /> : null}
			</div>
		</div>
	);
}
