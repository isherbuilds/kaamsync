import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Clock from "lucide-react/dist/esm/icons/clock";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import { Form } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { type ProductKey, products } from "~/config/billing";

interface Subscription {
	id: string;
	status: string;
	productId: string;
	preTaxAmount: number | null;
	billingInterval: string | null;
	nextBillingDate: Date | null;
	cancelledAt: Date | null;
}

interface SubscriptionStatusProps {
	subscription: Subscription | null;
	currentPlan: ProductKey | null;
	loading?: boolean;
}

const statusConfig = {
	active: {
		icon: CheckCircle,
		color: "text-green-500",
		badge: "default" as const,
		label: "Active",
	},
	on_hold: {
		icon: AlertCircle,
		color: "text-yellow-500",
		badge: "secondary" as const,
		label: "On Hold",
	},
	cancelled: {
		icon: XCircle,
		color: "text-red-500",
		badge: "destructive" as const,
		label: "Cancelled",
	},
	expired: {
		icon: Clock,
		color: "text-gray-500",
		badge: "outline" as const,
		label: "Expired",
	},
	failed: {
		icon: AlertCircle,
		color: "text-red-500",
		badge: "destructive" as const,
		label: "Payment Failed",
	},
};

function formatDate(date: Date | null): string {
	if (!date) return "N/A";
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

function formatAmount(amount: number | null): string {
	if (amount === null) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount / 100);
}

export function SubscriptionStatus({
	subscription,
	currentPlan,
	loading,
}: SubscriptionStatusProps) {
	if (!subscription) {
		return (
			<div className="rounded border bg-card p-6">
				<div className="mb-4">
					<div className="font-semibold text-lg">Subscription</div>
					<div className="mt-1 text-muted-foreground text-sm">
						You're currently on the Free Plan
					</div>
				</div>
				<div>
					<p className="text-muted-foreground text-sm">
						Upgrade to unlock additional members, unlimited teams, and more
						storage for your growing business.
					</p>
					<Form method="POST" className="mt-4">
						<input type="hidden" name="intent" value="checkout" />
						<input type="hidden" name="plan" value="growth" />
						<input type="hidden" name="interval" value="monthly" />
						<Button type="submit" size="lg">
							Upgrade
						</Button>
					</Form>
				</div>
			</div>
		);
	}

	const status = statusConfig[subscription.status as keyof typeof statusConfig];
	const StatusIcon = status?.icon ?? AlertCircle;
	const planName = currentPlan ? products[currentPlan].name : "Unknown Plan";

	return (
		<div className="rounded border bg-card p-6">
			<div className="mb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 font-semibold text-lg">
						{planName}
						<Badge variant={status?.badge ?? "outline"}>
							{status?.label ?? subscription.status}
						</Badge>
					</div>
					<StatusIcon className={`size-5 ${status?.color ?? ""}`} />
				</div>
				<div className="mt-1 text-muted-foreground text-sm">
					Your current subscription
				</div>
			</div>
			<div className="space-y-4">
				<div className="grid gap-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Amount</span>
						<span className="font-medium">
							{formatAmount(subscription.preTaxAmount)}
							{subscription.billingInterval && (
								<span className="text-muted-foreground">
									/{subscription.billingInterval}
								</span>
							)}
						</span>
					</div>
					{subscription.nextBillingDate && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{subscription.status === "cancelled" ? "Ends on" : "Renews on"}
							</span>
							<span className="font-medium">
								{formatDate(subscription.nextBillingDate)}
							</span>
						</div>
					)}
					{subscription.cancelledAt && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">Cancelled on</span>
							<span className="font-medium">
								{formatDate(subscription.cancelledAt)}
							</span>
						</div>
					)}
				</div>
			</div>
			<div className="mt-4 border-t pt-4">
				<Form method="POST">
					<input type="hidden" name="intent" value="portal" />
					<Button type="submit" variant="outline" disabled={loading}>
						{loading ? "Loading..." : "Manage Subscription"}
					</Button>
				</Form>
			</div>
		</div>
	);
}
