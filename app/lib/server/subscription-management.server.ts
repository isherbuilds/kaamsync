/**
 * Subscription Management Server Functions
 * Handles subscription upgrades, downgrades, and plan changes via Dodo Payments API
 */

import { dodoPayments, type ProductKey, productIds } from "~/lib/billing";
import {
	checkPlanLimits,
	getOrganizationSubscription,
} from "~/lib/server/billing.server";

// Proration modes supported by Dodo Payments
export type ProrationMode =
	| "prorated_immediately" // Fair-time accounting, charges/credits based on remaining cycle
	| "difference_immediately" // Upgrade: charge difference, Downgrade: credit for future
	| "full_immediately"; // Full charge, ignores remaining time

export interface PlanChangePreview {
	immediateCharge: {
		totalAmount: number;
		settlementAmount: number;
		currency: string;
		customerCredits: number;
		tax: number | null;
	};
	newPlan: {
		subscriptionId: string;
		productId: string;
		status: string;
		billingInterval: string | null;
		amount: number | null;
		currency: string | null;
	};
}

export interface PlanChangeResult {
	success: boolean;
	status?: string;
	subscriptionId?: string;
	invoiceId?: string;
	paymentId?: string;
	prorationBillingMode?: string;
	error?: string;
}

/**
 * Get the product ID for a plan and interval
 */
export function getProductIdForPlan(
	plan: ProductKey,
	interval: "monthly" | "yearly",
): string | null {
	if (!productIds) return null;

	if (plan === "growth") {
		return interval === "monthly"
			? productIds.growth.monthly
			: productIds.growth.yearly;
	}

	if (plan === "pro") {
		return interval === "monthly"
			? productIds.pro.monthly
			: productIds.pro.yearly;
	}

	return null;
}

/**
 * Preview a plan change before committing
 * Shows the customer exactly what they'll be charged
 */
export async function previewPlanChange(
	subscriptionId: string,
	newProductId: string,
	prorationMode: ProrationMode = "prorated_immediately",
): Promise<{ success: boolean; preview?: PlanChangePreview; error?: string }> {
	if (!dodoPayments) {
		return { success: false, error: "Billing not configured" };
	}

	try {
		const preview = await dodoPayments.subscriptions.previewChangePlan(
			subscriptionId,
			{
				product_id: newProductId,
				quantity: 1,
				proration_billing_mode: prorationMode,
			},
		);

		return {
			success: true,
			preview: {
				immediateCharge: {
					totalAmount: preview.immediate_charge.summary.total_amount,
					settlementAmount: preview.immediate_charge.summary.settlement_amount,
					currency: preview.immediate_charge.summary.currency,
					customerCredits: preview.immediate_charge.summary.customer_credits,
					tax: preview.immediate_charge.summary.tax ?? null,
				},
				newPlan: {
					subscriptionId: preview.new_plan.subscription_id,
					productId: preview.new_plan.product_id,
					status: preview.new_plan.status,
					billingInterval: preview.new_plan.payment_frequency_interval ?? null,
					amount: preview.new_plan.recurring_pre_tax_amount ?? null,
					currency: preview.new_plan.currency ?? null,
				},
			},
		};
	} catch (error) {
		console.error("[Subscription] Preview error:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to preview plan change",
		};
	}
}

/**
 * Execute a plan change (upgrade or downgrade)
 *
 * For upgrades: Charges immediately based on proration mode
 * For downgrades: May create credits for future renewals
 *
 * IMPORTANT: For overusage scenarios (e.g., Growth user with 11 members upgrading to Pro):
 * - The upgrade will succeed and the new plan limits apply immediately
 * - Any usage-based charges (overage members) from the current period are settled
 * - The new plan's included members (25 for Pro) will cover the existing 11 members
 */
export async function changePlan(
	subscriptionId: string,
	newProductId: string,
	prorationMode: ProrationMode = "prorated_immediately",
): Promise<PlanChangeResult> {
	if (!dodoPayments) {
		return { success: false, error: "Billing not configured" };
	}

	try {
		// Note: changePlan returns void, we need to rely on webhooks for confirmation
		await dodoPayments.subscriptions.changePlan(subscriptionId, {
			product_id: newProductId,
			quantity: 1,
			proration_billing_mode: prorationMode,
		});

		return {
			success: true,
			status: "processing",
			subscriptionId,
			prorationBillingMode: prorationMode,
		};
	} catch (error) {
		console.error("[Subscription] Change plan error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to change plan",
		};
	}
}

/**
 * Validate if a plan change is allowed
 *
 * For downgrades: Checks if current usage exceeds new plan limits
 * For upgrades: Always allowed (new plan has higher limits)
 */
export async function validatePlanChange(
	organizationId: string,
	currentPlan: ProductKey,
	newPlan: ProductKey,
): Promise<{
	allowed: boolean;
	isUpgrade: boolean;
	violations?: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
	};
	message?: string;
}> {
	// Plan hierarchy: starter < growth < pro < enterprise
	const planHierarchy: Record<ProductKey, number> = {
		starter: 0,
		growth: 1,
		pro: 2,
		enterprise: 3,
	};

	const isUpgrade = planHierarchy[newPlan] > planHierarchy[currentPlan];

	// Upgrades are always allowed
	if (isUpgrade) {
		return { allowed: true, isUpgrade: true };
	}

	// For downgrades, check if usage exceeds new plan limits
	const limitCheck = await checkPlanLimits(organizationId, newPlan);

	if (!limitCheck.withinLimits) {
		const messages: string[] = [];

		if (limitCheck.violations.members) {
			messages.push(
				`Remove ${limitCheck.violations.members.current - limitCheck.violations.members.limit} members`,
			);
		}
		if (limitCheck.violations.teams) {
			messages.push(
				`Remove ${limitCheck.violations.teams.current - limitCheck.violations.teams.limit} teams`,
			);
		}

		return {
			allowed: false,
			isUpgrade: false,
			violations: limitCheck.violations,
			message: `To downgrade to ${newPlan}, you need to: ${messages.join(", ")}`,
		};
	}

	return { allowed: true, isUpgrade: false };
}

/**
 * Get subscription details for plan change
 */
export async function getSubscriptionForPlanChange(organizationId: string) {
	const subscription = await getOrganizationSubscription(organizationId);

	if (!subscription) {
		return null;
	}

	return {
		id: subscription.id,
		dodoSubscriptionId: subscription.dodoSubscriptionId,
		productId: subscription.productId,
		planKey: subscription.planKey as ProductKey | null,
		status: subscription.status,
		billingInterval: subscription.billingInterval as
			| "monthly"
			| "yearly"
			| null,
		currentPeriodEnd: subscription.currentPeriodEnd,
	};
}

/**
 * Handle overusage scenario during upgrade
 *
 * Example: User on Growth (10 members included) has 11 members and upgrades to Pro (25 members)
 *
 * What happens:
 * 1. The 11th member was being charged as overage ($5/month on Growth)
 * 2. When upgrading mid-cycle (e.g., on the 15th):
 *    - Prorated charge for the new plan is calculated
 *    - Prorated credit for unused time on old plan is applied
 *    - Any pending overage charges are settled in the current invoice
 * 3. After upgrade:
 *    - All 11 members are now within Pro's 25-member limit
 *    - No more overage charges for members
 *
 * The proration mode determines how this is handled:
 * - prorated_immediately: Fair calculation based on days remaining
 * - difference_immediately: Simple price difference (recommended for clear upgrades)
 */
export function calculateOverageSettlement(
	currentMembers: number,
	currentPlanLimit: number,
	newPlanLimit: number,
	daysRemainingInCycle: number,
	totalDaysInCycle: number,
	overageRatePerMember: number, // in cents
): {
	overageMembers: number;
	overageChargeSettled: number;
	membersNowIncluded: number;
} {
	const overageMembers = Math.max(0, currentMembers - currentPlanLimit);

	// Calculate prorated overage that would have been charged for remaining days
	const proratedOverage =
		totalDaysInCycle > 0
			? Math.round(
					(overageMembers * overageRatePerMember * daysRemainingInCycle) /
						totalDaysInCycle,
				)
			: 0;

	// After upgrade, check if members are now within limits
	const membersNowIncluded = Math.min(currentMembers, newPlanLimit);

	return {
		overageMembers,
		overageChargeSettled: proratedOverage,
		membersNowIncluded,
	};
}
