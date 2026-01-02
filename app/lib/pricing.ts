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

// Plan identifiers (must match Dodo Payments product IDs)
export const PLAN_ID = {
	STARTER: "starter",
	PRO: "pro",
	BUSINESS: "business",
	ENTERPRISE: "enterprise",
} as const;

import { getEnv } from "~/lib/env";

export type PlanId = (typeof PLAN_ID)[keyof typeof PLAN_ID];

// Dodo Payments product IDs - Update these with actual product IDs from Dodo dashboard
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
 * Check if organization can add more members
 */
export function canAddMember(
	planId: PlanId | string | null | undefined,
	currentMemberCount: number,
): boolean {
	const limits = getPlanLimits(planId);
	if (limits.maxMembers === null) return true;
	return currentMemberCount < limits.maxMembers;
}

/**
 * Check if organization can add more teams
 */
export function canAddTeam(
	planId: PlanId | string | null | undefined,
	currentTeamCount: number,
): boolean {
	const limits = getPlanLimits(planId);
	if (limits.maxTeams === null) return true;
	return currentTeamCount < limits.maxTeams;
}

/**
 * Get remaining member slots
 */
export function getRemainingMemberSlots(
	planId: PlanId | string | null | undefined,
	currentMemberCount: number,
): number | null {
	const limits = getPlanLimits(planId);
	if (limits.maxMembers === null) return null; // Unlimited
	return Math.max(0, limits.maxMembers - currentMemberCount);
}

/**
 * Get remaining team slots
 */
export function getRemainingTeamSlots(
	planId: PlanId | string | null | undefined,
	currentTeamCount: number,
): number | null {
	const limits = getPlanLimits(planId);
	if (limits.maxTeams === null) return null; // Unlimited
	return Math.max(0, limits.maxTeams - currentTeamCount);
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

/**
 * Check if a feature is available for a plan
 */
export function hasFeature(
	planId: PlanId | string | null | undefined,
	feature: keyof Omit<
		PlanLimits,
		| "maxMembers"
		| "maxTeams"
		| "storageBytes"
		| "storagePerUserBytes"
		| "historyDays"
	>,
): boolean {
	const limits = getPlanLimits(planId);
	return limits[feature];
}

/**
 * Check if plan has approval workflows enabled
 */
export function hasApprovalWorkflows(
	planId: PlanId | string | null | undefined,
): boolean {
	return getPlanLimits(planId).hasApprovalWorkflows;
}

/**
 * Compare two plans and determine if upgrade is needed
 */
export function isUpgrade(
	fromPlanId: PlanId | string | null | undefined,
	toPlanId: PlanId | string,
): boolean {
	const planOrder: PlanId[] = [
		PLAN_ID.STARTER,
		PLAN_ID.PRO,
		PLAN_ID.BUSINESS,
		PLAN_ID.ENTERPRISE,
	];
	const fromIndex = planOrder.indexOf(
		(fromPlanId as PlanId) || PLAN_ID.STARTER,
	);
	const toIndex = planOrder.indexOf(toPlanId as PlanId);
	return toIndex > fromIndex;
}

/**
 * Get the checkout slug for a plan (used with Dodo Payments checkout)
 */
export function getCheckoutSlug(planId: PlanId, yearly = false): string | null {
	if (planId === PLAN_ID.STARTER) return null; // Free plan, no checkout
	return yearly ? `${planId}_yearly` : `${planId}_monthly`;
}

/**
 * Format price for display
 */
export function formatPrice(plan: PlanConfig, yearly = false): string {
	if (plan.price === 0) return "Free";

	const price = yearly && plan.priceYearly ? plan.priceYearly : plan.price;
	const amount = (price / 100).toFixed(0);

	if (plan.isPerSeat) {
		return yearly ? `$${amount}/user/year` : `$${amount}/user/month`;
	}
	return yearly ? `$${amount}/year` : `$${amount}/month`;
}

/**
 * Get upgrade prompt message based on limit hit
 */
export function getUpgradePrompt(
	planId: PlanId | string | null | undefined,
	limitType: "members" | "teams" | "storage",
): string {
	const plan = getPlan(planId);
	const nextPlan =
		plan.id === PLAN_ID.STARTER
			? PLANS[PLAN_ID.PRO]
			: plan.id === PLAN_ID.PRO
				? PLANS[PLAN_ID.BUSINESS]
				: PLANS[PLAN_ID.ENTERPRISE];

	switch (limitType) {
		case "members":
			return `You've reached the ${plan.limits.maxMembers} member limit on the ${plan.name} plan. Upgrade to ${nextPlan.name} to add up to ${nextPlan.limits.maxMembers ?? "unlimited"} members.`;
		case "teams":
			return `You've reached the ${plan.limits.maxTeams} team limit on the ${plan.name} plan. Upgrade to ${nextPlan.name} for ${nextPlan.limits.maxTeams ?? "unlimited"} teams.`;
		case "storage":
			return `You've reached your storage limit. Upgrade to ${nextPlan.name} for more storage.`;
		default:
			return `Upgrade to ${nextPlan.name} for more features and higher limits.`;
	}
}
