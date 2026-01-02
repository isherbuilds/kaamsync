/**
 * KaamSync Pricing Model Configuration
 *
 * Centralized pricing constants and plan limits for the application.
 * All plan-related logic should reference these constants.
 *
 * Pricing Tiers:
 * - Starter (Free): $0 - Up to 5 members, 1GB Storage, 1 Team
 * - Pro (Org-based): $29/month flat - Up to 20 members, 10GB Storage, 3 Teams
 * - Business (Seat-based): $9/user/month - Unlimited members, 10GB/user pooled, Unlimited Teams
 */

import { getEnv } from "~/lib/env";

// Plan identifiers (must match Dodo Payments product IDs)
export const PLAN_ID = {
	STARTER: "starter",
	PRO: "pro",
	BUSINESS: "business",
	ENTERPRISE: "enterprise",
} as const;

export type PlanId = (typeof PLAN_ID)[keyof typeof PLAN_ID];

// Plan upgrade order (lowest to highest tier)
export const PLAN_ORDER: readonly PlanId[] = [
	PLAN_ID.STARTER,
	PLAN_ID.PRO,
	PLAN_ID.BUSINESS,
	PLAN_ID.ENTERPRISE,
] as const;

// Dodo Payments product IDs - Update these with actual product IDs from Dodo dashboard
export const DODO_PRODUCT_IDS = {
	PRO_MONTHLY: getEnv("DODO_PRODUCT_PRO_MONTHLY") || "pdt_ProPlanMonthly",
	PRO_YEARLY: getEnv("DODO_PRODUCT_PRO_YEARLY") || "pdt_ProPlanYearly",
	BUSINESS_MONTHLY:
		getEnv("DODO_PRODUCT_BUSINESS_MONTHLY") || "pdt_BusinessPlanMonthly",
	BUSINESS_YEARLY:
		getEnv("DODO_PRODUCT_BUSINESS_YEARLY") || "pdt_BusinessPlanYearly",
} as const;

// Storage in bytes
const GB = 1024 * 1024 * 1024;

export interface PlanLimits {
	maxMembers: number | null; // null = unlimited
	maxTeams: number | null; // null = unlimited
	storageBytes: number | null; // null = unlimited (or per-seat calculation)
	storagePerUserBytes?: number; // For Business plan (pooled storage)
	historyDays: number | null; // null = unlimited
	hasApprovalWorkflows: boolean;
	hasPrioritySupport: boolean;
	hasSSO: boolean;
	hasCustomIntegrations: boolean;
	hasDedicatedSupport: boolean;
}

export interface PlanConfig {
	id: PlanId;
	name: string;
	description: string;
	price: number; // Monthly price in cents (0 for free)
	priceYearly?: number; // Yearly price in cents (with discount)
	isPerSeat: boolean;
	limits: PlanLimits;
	trialDays?: number;
	dodoProductId?: string;
	dodoProductIdYearly?: string;
}

export const PLANS: Record<PlanId, PlanConfig> = {
	[PLAN_ID.STARTER]: {
		id: PLAN_ID.STARTER,
		name: "Starter",
		description: "For small teams fixing their messy chat workflows.",
		price: 0,
		isPerSeat: false,
		limits: {
			maxMembers: 5,
			maxTeams: 2,
			storageBytes: 1 * GB,
			historyDays: null,
			hasApprovalWorkflows: false,
			hasPrioritySupport: false,
			hasSSO: false,
			hasCustomIntegrations: false,
			hasDedicatedSupport: false,
		},
	},
	[PLAN_ID.PRO]: {
		id: PLAN_ID.PRO,
		name: "Pro",
		description: "The sweet spot for growing operations teams.",
		price: 2900, // $29.00
		priceYearly: 29000, // $290/year (~$24.17/month, 2 months free)
		isPerSeat: false,
		trialDays: 14,
		dodoProductId: DODO_PRODUCT_IDS.PRO_MONTHLY,
		dodoProductIdYearly: DODO_PRODUCT_IDS.PRO_YEARLY,
		limits: {
			maxMembers: 20,
			maxTeams: 3,
			storageBytes: 10 * GB,
			historyDays: null, // Unlimited
			hasApprovalWorkflows: true,
			hasPrioritySupport: true,
			hasSSO: false,
			hasCustomIntegrations: false,
			hasDedicatedSupport: false,
		},
	},
	[PLAN_ID.BUSINESS]: {
		id: PLAN_ID.BUSINESS,
		name: "Business",
		description: "For large organizations scaling across many departments.",
		price: 1000, // $10.00 per user
		priceYearly: 9000, // $90/user/year (~$7.50/month)
		isPerSeat: true,
		trialDays: 14,
		dodoProductId: DODO_PRODUCT_IDS.BUSINESS_MONTHLY,
		dodoProductIdYearly: DODO_PRODUCT_IDS.BUSINESS_YEARLY,
		limits: {
			maxMembers: null, // Unlimited
			maxTeams: null, // Unlimited
			storageBytes: null, // Calculated per user
			storagePerUserBytes: 10 * GB, // 10GB per user, pooled
			historyDays: null, // Unlimited
			hasApprovalWorkflows: true,
			hasPrioritySupport: true,
			hasSSO: true,
			hasCustomIntegrations: true,
			hasDedicatedSupport: true,
		},
	},
	[PLAN_ID.ENTERPRISE]: {
		id: PLAN_ID.ENTERPRISE,
		name: "Enterprise",
		description: "Custom solutions for mission-critical operations.",
		price: 0, // Contact Sales
		isPerSeat: true,
		limits: {
			maxMembers: null, // 100+ (Unlimited in code, gated by sales)
			maxTeams: null, // Unlimited
			storageBytes: null, // Unlimited
			historyDays: null, // Unlimited
			hasApprovalWorkflows: true,
			hasPrioritySupport: true,
			hasSSO: true,
			hasCustomIntegrations: true,
			hasDedicatedSupport: true,
		},
	},
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get plan configuration by ID
 */
export function getPlan(
	planId: PlanId | string | null | undefined,
): PlanConfig {
	if (planId && planId in PLANS) {
		return PLANS[planId as PlanId];
	}
	// Default to starter plan
	return PLANS[PLAN_ID.STARTER];
}

/**
 * Get plan limits for an organization
 */
export function getPlanLimits(
	planId: PlanId | string | null | undefined,
): PlanLimits {
	return getPlan(planId).limits;
}

/**
 * Check if target plan is an upgrade from current plan
 */
export function isUpgrade(
	currentPlanId: PlanId | string | null | undefined,
	targetPlanId: PlanId | string | null | undefined,
): boolean {
	const currentIndex = PLAN_ORDER.indexOf(
		(currentPlanId as PlanId) || PLAN_ID.STARTER,
	);
	const targetIndex = PLAN_ORDER.indexOf(
		(targetPlanId as PlanId) || PLAN_ID.STARTER,
	);
	return targetIndex > currentIndex;
}

/**
 * Calculate total storage for an organization
 * For Business plan, storage is pooled based on member count
 */
export function getOrganizationStorageLimit(
	planId: PlanId | string | null | undefined,
	memberCount: number,
): number | null {
	const plan = getPlan(planId);

	if (plan.limits.storageBytes !== null) {
		return plan.limits.storageBytes;
	}

	// Business plan: storage per user, pooled
	if (plan.limits.storagePerUserBytes) {
		return plan.limits.storagePerUserBytes * memberCount;
	}

	return null; // Unlimited
}
