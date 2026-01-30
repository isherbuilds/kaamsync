import { useCallback, useRef, useState } from "react";
import { data, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
	PricingComparison,
	PricingGrid,
} from "~/components/billing/pricing-grid";
import { SubscriptionStatus } from "~/components/billing/subscription-status";
import { UsageDisplay } from "~/components/billing/usage-display";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	type BillingInterval,
	canCheckout,
	getCheckoutSlug,
	type ProductKey,
	products,
} from "~/config/billing";
import { authClient } from "~/lib/auth/client";
import {
	hasBillingManagePermission,
	hasBillingViewPermission,
	type OrgRole,
} from "~/lib/auth/permissions";
import { getServerSession } from "~/lib/auth/server";
import {
	billingConfig,
	fetchOrgSubscription,
	fetchOrgUsage,
	resolveProductPlan,
} from "~/lib/billing/service";
import { getMemberRole } from "~/lib/organization/service";
import type { Route } from "./+types/billing";

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId) {
		return data({
			subscription: null,
			payments: [],
			usage: { members: 0, teams: 0, matters: 0, storageGb: 0 },
			billingEnabled: billingConfig.enabled,
			organizationId: null,
			userRole: null as OrgRole | null,
			currentPlan: null as ProductKey | null,
		});
	}

	const orgId = session.session.activeOrganizationId;
	const userId = session.user.id;

	// Fetch role, billing data, and usage in parallel
	const [subscription, userRole, usage] = await Promise.all([
		fetchOrgSubscription(orgId),
		getMemberRole(orgId, userId),
		fetchOrgUsage(orgId),
	]);

	// Determine current plan - use stored planKey if available, fallback to productId lookup
	const currentPlan: ProductKey | null =
		(subscription?.plan as ProductKey | null) ??
		(subscription?.productId
			? resolveProductPlan(subscription.productId)
			: null);

	return data({
		subscription,
		usage,
		billingEnabled: billingConfig.enabled,
		organizationId: orgId,
		userRole,
		currentPlan,
	});
}

interface SelectedPlan {
	plan: ProductKey;
	interval: BillingInterval;
}

export default function Component({ loaderData }: Route.ComponentProps) {
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
	const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

	// Permission checks
	const canManage = hasBillingManagePermission(userRole);
	const canView = hasBillingViewPermission(userRole);

	// Rate limiting for checkout attempts (5 per minute)
	const checkoutAttempts = useRef<number[]>([]);
	const MAX_CHECKOUT_ATTEMPTS = 5;
	const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

	// Show success/error toasts based on URL params
	const success = searchParams.get("success");
	const cancelled = searchParams.get("cancelled");

	if (success === "true") {
		// Clean URL by removing query params
		searchParams.delete("success");
		toast.success("Subscription updated successfully!");
	} else if (cancelled === "true") {
		searchParams.delete("cancelled");
		toast.info("Checkout cancelled");
	}

	const handleCheckout = useCallback(
		async (plan: ProductKey, interval: BillingInterval) => {
			// Permission check - only owner/admin can manage billing
			if (!canManage) {
				toast.error(
					"You don't have permission to manage billing. Contact your organization admin.",
				);
				return;
			}

			if (plan === "starter") {
				toast.info("You're on the Free plan. Upgrade to unlock more features.");
				return;
			}

			if (plan === "enterprise") {
				window.location.href =
					"mailto:sales@kaamsync.com?subject=Enterprise%20Plan%20Inquiry";
				return;
			}

			// Rate limiting check
			const now = Date.now();
			checkoutAttempts.current = checkoutAttempts.current.filter(
				(ts) => now - ts < RATE_LIMIT_WINDOW_MS,
			);

			if (checkoutAttempts.current.length >= MAX_CHECKOUT_ATTEMPTS) {
				const oldestAttempt = checkoutAttempts.current[0];
				const retryAfterSeconds = Math.ceil(
					(RATE_LIMIT_WINDOW_MS - (now - oldestAttempt)) / 1000,
				);
				toast.error(
					`Too many checkout attempts. Please try again in ${retryAfterSeconds} seconds.`,
				);
				return;
			}

			checkoutAttempts.current.push(now);

			if (!canCheckout(plan)) {
				toast.error("This plan is not available for checkout");
				return;
			}

			const slug = getCheckoutSlug(plan, interval);

			if (!slug) {
				toast.error(
					`Product not configured for ${plan} (${interval}). Please contact support.`,
				);
				return;
			}

			setLoading(true);
			try {
				const { data, error } = await authClient.dodopayments.checkoutSession({
					slug,
					metadata: organizationId ? { organizationId } : undefined,
				});

				if (error) {
					throw new Error(error.message || "Checkout failed");
				}

				if (data?.url) {
					// Log checkout URL for debugging SSL issues in test mode
					console.log("[Checkout] Redirecting to:", data.url);

					// If you encounter SSL errors with test.checkout.dodopayments.com,
					// you can copy this URL and open it in a different browser
					window.location.href = data.url;
				} else {
					toast.error("Checkout URL not received. Please try again.");
				}
			} catch (err) {
				console.error("Checkout error:", err);
				toast.error(err instanceof Error ? err.message : "Checkout failed");
			} finally {
				setLoading(false);
			}
		},
		[organizationId, canManage],
	);

	const handleManageSubscription = useCallback(async () => {
		// Permission check
		if (!canManage) {
			toast.error(
				"You don't have permission to manage billing. Contact your organization admin.",
			);
			return;
		}

		setLoading(true);
		try {
			const { data, error } = await authClient.dodopayments.customer.portal();

			if (error) {
				throw new Error(error.message || "Failed to open portal");
			}

			if (data?.url) {
				window.location.href = data.url;
			}
		} catch (err) {
			console.error("Portal error:", err);
			toast.error(err instanceof Error ? err.message : "Failed to open portal");
		} finally {
			setLoading(false);
		}
	}, [canManage]);

	const handlePlanSelect = useCallback(
		(plan: ProductKey, interval: BillingInterval) => {
			// Permission check
			if (!canManage) {
				toast.error(
					"You don't have permission to change plans. Contact your organization admin.",
				);
				return;
			}

			if (plan === "starter") {
				if (subscription && subscription.status === "active") {
					// Redirect to portal for downgrade
					toast.info("Please downgrade your plan in the customer portal.");
					handleManageSubscription();
					return;
				}
				toast.info("You are already on the Free plan.");
				return;
			}
			if (plan === "enterprise") {
				window.location.href =
					"mailto:sales@kaamsync.com?subject=Enterprise%20Plan%20Inquiry";
				return;
			}

			// If user has an active subscription, redirect to portal for ANY plan change
			if (subscription && subscription.status === "active") {
				handleManageSubscription();
				toast.info(
					"Please manage your subscription details in the customer portal.",
				);
			} else {
				// New subscription
				setSelectedPlan({ plan, interval });
			}
		},
		[canManage, subscription, handleManageSubscription],
	);

	const confirmPlanChange = useCallback(async () => {
		if (!selectedPlan) return;
		await handleCheckout(selectedPlan.plan, selectedPlan.interval);
		setSelectedPlan(null);
	}, [selectedPlan, handleCheckout]);

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

			{/* Subscription Status */}
			<SubscriptionStatus
				subscription={subscription ?? null}
				currentPlan={currentPlan}
				onManage={handleManageSubscription}
				onUpgrade={() => setShowPricing(true)}
				loading={loading}
			/>
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
					<PricingGrid
						currentPlan={currentPlan}
						onSelectPlan={handlePlanSelect}
						loading={loading}
					/>

					{/* Feature Comparison (toggleable) */}
					<div className="space-y-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowComparison((s) => !s)}
							className="text-muted-foreground text-sm"
						>
							{showComparison ? "Hide" : "Show"} feature comparison
						</Button>
						{showComparison ? <PricingComparison /> : null}
					</div>
				</div>
			)}

			{/* Confirmation Dialog for New Subscriptions */}
			<AlertDialog
				open={!!selectedPlan}
				onOpenChange={(open) => !open && setSelectedPlan(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Plan Change</AlertDialogTitle>
						<AlertDialogDescription>
							You're about to upgrade to the{" "}
							<strong>
								{selectedPlan && products[selectedPlan.plan].name}
							</strong>{" "}
							plan ({selectedPlan?.interval} billing). You'll be redirected to
							complete payment.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="mr-auto">Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmPlanChange} disabled={loading}>
							{loading ? "Processing..." : "Continue to Checkout"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<div className="p-6">
			<Alert variant="destructive">
				<AlertTitle>Error loading billing information</AlertTitle>
				<AlertDescription>
					Please try again later or contact support if the problem persists.
				</AlertDescription>
			</Alert>
		</div>
	);
}
