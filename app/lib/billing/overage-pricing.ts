/**
 * Configurable overage pricing per plan/resource
 * Supports different pricing tiers and unit types
 */

import type { ProductKey } from "./plans";

// =============================================================================
// TYPES
// =============================================================================

export type OverageResource = "members" | "storage";

export interface OveragePricingConfig {
	enabled: boolean;
	pricePerUnit: number; // cents
	unit: string;
	rollover?: boolean; // Whether unused quota rolls over
}

export type OveragePricing = Record<
	ProductKey,
	Record<OverageResource, OveragePricingConfig>
>;

export interface OverageCost {
	cost: number; // cents
	unit: string;
	currency: string;
	pricing: OveragePricingConfig;
}

export interface Overages {
	members: OverageCost;
	storage: OverageCost;
	totalCostCents: number;
}

// =============================================================================
// OVERAGE PRICING CONFIGURATION
// =============================================================================

/**
 * Overage pricing configuration
 * - Starter: No overage allowed (hard block)
 * - Growth: $5/member, $2/GB
 * - Pro: $4/member, $1/GB
 * - Enterprise: Unlimited (no overage)
 */
export const overagePricing: OveragePricing = {
	starter: {
		members: { enabled: false, pricePerUnit: 0, unit: "member" },
		storage: { enabled: false, pricePerUnit: 0, unit: "GB" },
	},
	growth: {
		members: { enabled: true, pricePerUnit: 500, unit: "member" }, // $5/member/month
		storage: { enabled: true, pricePerUnit: 200, unit: "GB" }, // $2/GB/month
	},
	pro: {
		members: { enabled: true, pricePerUnit: 400, unit: "member" }, // $4/member/month
		storage: { enabled: true, pricePerUnit: 100, unit: "GB" }, // $1/GB/month
	},
	enterprise: {
		members: { enabled: false, pricePerUnit: 0, unit: "member" }, // Unlimited
		storage: { enabled: false, pricePerUnit: 0, unit: "GB" }, // Unlimited
	},
};

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate overage cost for a specific resource
 */
export function calculateOverageCost(
	plan: ProductKey,
	resource: OverageResource,
	overageAmount: number,
): OverageCost {
	const pricing = overagePricing[plan]?.[resource];

	if (!pricing || !pricing.enabled) {
		return {
			cost: 0,
			unit: "",
			currency: "USD",
			pricing: { enabled: false, pricePerUnit: 0, unit: "" },
		};
	}

	return {
		cost: Math.max(0, overageAmount * pricing.pricePerUnit),
		unit: pricing.unit,
		currency: "USD",
		pricing,
	};
}

/**
 * Calculate all overage costs for an organization
 */
export function calculateOverages(
	plan: ProductKey,
	currentMembers: number,
	memberLimit: number,
	currentStorageBytes: number,
	storageLimitGb: number,
): Overages {
	// Member overage
	const memberOverage =
		memberLimit === -1 ? 0 : Math.max(0, currentMembers - memberLimit);
	const memberCost = calculateOverageCost(plan, "members", memberOverage);

	// Storage overage
	const storageLimitBytes =
		storageLimitGb === -1 ? Infinity : storageLimitGb * 1024 * 1024 * 1024;
	const storageOverageBytes =
		storageLimitBytes === -1
			? 0
			: Math.max(0, currentStorageBytes - storageLimitBytes);
	const storageOverageGb = storageOverageBytes / (1024 * 1024 * 1024);
	const storageCost = calculateOverageCost(plan, "storage", storageOverageGb);

	return {
		members: memberCost,
		storage: storageCost,
		totalCostCents: memberCost.cost + storageCost.cost,
	};
}

/**
 * Get overage pricing description for UI display
 */
export function getOverageDescription(plan: ProductKey): {
	members: string | null;
	storage: string | null;
} {
	const memberPricing = overagePricing[plan].members;
	const storagePricing = overagePricing[plan].storage;

	return {
		members: memberPricing.enabled
			? `$${memberPricing.pricePerUnit / 100}/${memberPricing.unit} per month`
			: null,
		storage: storagePricing.enabled
			? `$${storagePricing.pricePerUnit / 100}/${storagePricing.unit} per month`
			: null,
	};
}

/**
 * Check if a plan allows overage for a resource
 */
export function allowsOverage(
	plan: ProductKey,
	resource: OverageResource,
): boolean {
	return overagePricing[plan]?.[resource]?.enabled ?? false;
}

/**
 * Get the price per unit for overage
 */
export function getOveragePricePerUnit(
	plan: ProductKey,
	resource: OverageResource,
): number {
	return overagePricing[plan]?.[resource]?.pricePerUnit ?? 0;
}

/**
 * Format overage cost for display
 */
export function formatOverageCost(cents: number): string {
	if (cents === 0) return "$0.00";
	const dollars = cents / 100;
	return dollars.toFixed(2);
}
