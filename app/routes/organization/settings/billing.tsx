import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { PricingComparison, UsageDisplay } from "~/components/billing";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { requireSession } from "~/lib/auth/auth-helper";
import { canManageBilling, canViewBilling } from "~/lib/auth/permissions";
import {
	billingConfig,
	getOrganizationSubscription,
	getOrganizationUsage,
	getPlanByProductId,
} from "~/lib/billing/billing.server";
import { logger } from "~/lib/logging/logger";
import { getOrganizationMemberRole } from "~/lib/server/organization.server";
import type { Route } from "./+types/billing.ts";

export async function loader({ request }: Route.LoaderArgs) {
	const { session, user } = await requireSession(request);

	const organizationId = session.activeOrganizationId;
	const userId = user.id;

	if (!organizationId)
		throw new Response("Organization not found", { status: 404 });

	// Fetch role, billing data, and usage in parallel
	const [subscription, userRole, usage] = await Promise.all([
		getOrganizationSubscription(organizationId, userId),
		getOrganizationMemberRole(organizationId, userId),
		getOrganizationUsage(organizationId),
	]);

	logger.info("[Billing Loader] Fetched billing data", {
		subscription,
		usage,
	});

	if (!userRole || userRole !== "owner") {
		// Only owners can access billing settings
		throw new Response("Forbidden", { status: 403 });
	}

	// Determine current plan - use stored planKey if available, fallback to productId lookup
	const currentPlan = subscription?.productId
		? getPlanByProductId(subscription.productId)
		: "starter";

	return {
		subscription,
		usage,
		billingEnabled: billingConfig.enabled,
		organizationId,
		userRole,
		currentPlan,
	};
}

export default function BillingSettings({ loaderData }: Route.ComponentProps) {
	const {
		subscription,
		usage,
		billingEnabled,
		organizationId,
		userRole,
		currentPlan,
	} = loaderData;

	const [searchParams] = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [showPricing, setShowPricing] = useState(false);
	const [showComparison, setShowComparison] = useState(false);

	// Permission checks
	const canManage = canManageBilling(userRole);
	const canView = canViewBilling(userRole);

	// Show success/error toasts based on URL params
	const success = searchParams.get("success");
	const cancelled = searchParams.get("cancelled");

	if (success) {
		searchParams.delete("success");
		// Clean up URL
		toast.success("Subscription updated successfully.");
	} else if (cancelled) {
		searchParams.delete("cancelled");
		// Clean up URL
		toast.error("Subscription update was cancelled.");
	}

	if (!billingEnabled) {
		return (
			<div className="space-y-6">
				<div>
					<h3 className="font-medium text-lg">Billing</h3>
					<p className="text-muted-foreground text-sm">
						Billing is not configured for this environment.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="font-medium text-lg">Billing & Subscription</h3>
				<p className="text-muted-foreground text-sm">
					Manage your organization's subscription and billing details.
				</p>
			</div>
			<Separator />

			{/* Read-only access banner for non-admin users */}
			{canView && !canManage && (
				<Alert>
					<AlertTitle>View-only access</AlertTitle>
					<AlertDescription>
						You can view billing information, but only organization owners and
						admins can make changes to the subscription.
					</AlertDescription>
				</Alert>
			)}

			{/* Usage Display - Shows current usage vs plan limits */}
			<UsageDisplay usage={usage} currentPlan={currentPlan} />

			{/* Pricing Grid (expandable) */}
			{(showPricing || !subscription) && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="font-medium text-md">Available Plans</h4>
						{showPricing && subscription && (
							<button
								type="button"
								onClick={() => setShowPricing(false)}
								className="text-muted-foreground text-sm hover:underline"
							>
								Hide plans
							</button>
						)}
					</div>

					<div className="space-y-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowComparison(!showComparison)}
							className="text-muted-foreground text-sm"
						>
							{showComparison ? "Hide" : "Show"} feature comparison
						</Button>
						{showComparison && <PricingComparison />}
					</div>
				</div>
			)}
		</div>
	);
}
