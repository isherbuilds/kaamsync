import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
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
import { type ProductKey, products } from "~/lib/billing/plans";

interface Subscription {
	id: string;
	status: string;
	productId: string;
	amount: number | null;
	currency: string | null;
	billingInterval: string | null;
	currentPeriodEnd: Date | null;
	cancelledAt: Date | null;
}

interface SubscriptionStatusProps {
	subscription: Subscription | null;
	currentPlan: ProductKey | null;
	onManage: () => void;
	onUpgrade: () => void;
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

function formatAmount(amount: number | null, currency: string | null): string {
	if (amount === null) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency ?? "USD",
	}).format(amount / 100);
}

export function SubscriptionStatus({
	subscription,
	currentPlan,
	onManage,
	onUpgrade,
	loading,
}: SubscriptionStatusProps) {
	if (!subscription) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Subscription</CardTitle>
					<CardDescription>You're currently on the Free Plan</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						Upgrade to unlock additional members, unlimited teams, and more
						storage for your growing business.
					</p>
				</CardContent>
				<CardFooter>
					<Button onClick={onUpgrade} disabled={loading}>
						View Plans
					</Button>
				</CardFooter>
			</Card>
		);
	}

	const status = statusConfig[subscription.status as keyof typeof statusConfig];
	const StatusIcon = status?.icon ?? AlertCircle;
	const planName = currentPlan ? products[currentPlan].name : "Unknown Plan";

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{planName}
						<Badge variant={status?.badge ?? "outline"}>
							{status?.label ?? subscription.status}
						</Badge>
					</CardTitle>
					<StatusIcon className={`h-5 w-5 ${status?.color ?? ""}`} />
				</div>
				<CardDescription>Your current subscription</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-2 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Amount</span>
						<span className="font-medium">
							{formatAmount(subscription.amount, subscription.currency)}
							{subscription.billingInterval && (
								<span className="text-muted-foreground">
									/{subscription.billingInterval}
								</span>
							)}
						</span>
					</div>
					{subscription.currentPeriodEnd && (
						<div className="flex justify-between">
							<span className="text-muted-foreground">
								{subscription.status === "cancelled" ? "Ends on" : "Renews on"}
							</span>
							<span className="font-medium">
								{formatDate(subscription.currentPeriodEnd)}
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
			</CardContent>
			<CardFooter className="gap-2">
				<Button variant="outline" onClick={onManage} disabled={loading}>
					Manage Subscription
				</Button>
				{/* {subscription.status === "active" && ( */}
				<Button variant="secondary" onClick={onUpgrade} disabled={loading}>
					Change Plan
				</Button>
				{/* )} */}
			</CardFooter>
		</Card>
	);
}
