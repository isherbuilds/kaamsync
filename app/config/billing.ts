/**
 * @file Billing configuration and utilities
 * @description Defines billing plans, pricing tiers, product configurations, and utility
 * functions for pricing calculations. Works with DodoPayments for payment processing.
 *
 * Key exports:
 * - planLimits - Feature limits per plan (starter, growth, pro, enterprise)
 * - addonPricing - Add-on pricing in cents (seatCents, storageGbCents)
 * - products - Product definitions with features, pricing, and metadata
 * - getPrice() - Get price for plan/interval
 * - getMonthlyEquivalent() - Convert yearly to monthly equivalent
 * - canCheckout() - Check if plan allows checkout
 * - getEffectiveMemberLimit() - Calculate limit including purchased add-ons
 * - canPurchaseAddons() - Check if add-on purchase is allowed
 *
 * @see app/lib/billing/service.ts for server-side billing operations
 */

// =============================================================================
// PLAN LIMITS & PRICING
// =============================================================================

export const planLimits = {
	starter: {
		members: 3,
		teams: 5,
		matters: 250,
		storageGb: 0.5,
		maxFileSizeMb: 10,
		maxFiles: 50,
	},
	growth: {
		members: 10,
		teams: -1,
		matters: -1,
		storageGb: 10,
		maxFileSizeMb: 500,
		maxFiles: -1,
	},
	pro: {
		members: 25,
		teams: -1,
		matters: -1,
		storageGb: 30,
		maxFileSizeMb: 500,
		maxFiles: -1,
	},
	enterprise: {
		members: -1,
		teams: -1,
		matters: -1,
		storageGb: -1,
		maxFileSizeMb: 1000,
		maxFiles: -1,
	},
} as const;

export type ProductKey = keyof typeof planLimits;
export type BillingInterval = "monthly" | "yearly";

// =============================================================================
// ADD-ON PRICING & CONFIGURATION
// =============================================================================

export const addonPricing = {
	growth: { seatCents: 500, storageGbCents: 200 },
	pro: { seatCents: 400, storageGbCents: 100 },
} as const;

export const ADDON_PURCHASE_CUTOFF_DAYS = 5;
export const MIN_STORAGE_ADDON_GB = 5;

export type AddonType = "seat" | "storage";

export interface AddonConfig {
	seatAddonId: string | undefined;
	storageAddonId: string | undefined;
	seatPriceCents: number;
	storageGbPriceCents: number;
}

export const getAddonConfig = (plan: ProductKey): AddonConfig | null => {
	if (plan === "starter" || plan === "enterprise") return null;
	const pricing = addonPricing[plan];
	return {
		seatAddonId:
			plan === "growth"
				? process.env.DODO_ADDON_SEAT_GROWTH
				: process.env.DODO_ADDON_SEAT_PRO,
		storageAddonId:
			plan === "growth"
				? process.env.DODO_ADDON_STORAGE_GROWTH
				: process.env.DODO_ADDON_STORAGE_PRO,
		seatPriceCents: pricing.seatCents,
		storageGbPriceCents: pricing.storageGbCents,
	};
};

export const getEffectiveMemberLimit = (
	plan: ProductKey,
	purchasedSeats: number,
): number => {
	const baseLimit = planLimits[plan].members;
	if (baseLimit === -1) return -1;
	return baseLimit + purchasedSeats;
};

export const getEffectiveStorageLimit = (
	plan: ProductKey,
	purchasedStorageGB: number,
): number => {
	const baseLimit = planLimits[plan].storageGb;
	if (baseLimit === -1) return -1;
	return baseLimit + purchasedStorageGB;
};

export const canPurchaseAddons = (
	plan: ProductKey,
	nextBillingDate: Date | null,
): { allowed: boolean; reason?: string; daysUntilBilling?: number } => {
	if (plan === "starter") {
		return {
			allowed: false,
			reason: "Upgrade to Growth or Pro to purchase add-ons",
		};
	}
	if (plan === "enterprise") {
		return {
			allowed: false,
			reason: "Contact sales for Enterprise adjustments",
		};
	}
	if (!nextBillingDate) {
		return { allowed: true };
	}

	const now = new Date();
	const msUntilBilling = nextBillingDate.getTime() - now.getTime();
	const daysUntilBilling = Math.ceil(msUntilBilling / (1000 * 60 * 60 * 24));

	if (daysUntilBilling <= ADDON_PURCHASE_CUTOFF_DAYS) {
		return {
			allowed: false,
			reason: `Add-on purchases are disabled ${ADDON_PURCHASE_CUTOFF_DAYS} days before billing. Your next billing is in ${daysUntilBilling} day(s).`,
			daysUntilBilling,
		};
	}

	return { allowed: true, daysUntilBilling };
};

// =============================================================================
// PRODUCTS
// =============================================================================

export const products = {
	starter: {
		name: "Starter",
		slug: "starter",
		monthlyPrice: 0,
		yearlyPrice: 0,
		limits: planLimits.starter,
		hasAddons: false,
		popular: false,
		cta: "Get Started",
		features: [
			"Up to 3 team members",
			"5 teams",
			"250 matters",
			"500MB storage",
			"10MB max file size",
			"Email support",
		],
	},
	growth: {
		name: "Growth",
		slug: { monthly: "growth-monthly", yearly: "growth-yearly" },
		monthlyPrice: 2900,
		yearlyPrice: 29000,
		limits: planLimits.growth,
		hasAddons: true,
		addonPricing: addonPricing.growth,
		popular: true,
		cta: "Select Plan",
		features: [
			"Up to 10 team members",
			"Unlimited teams",
			"Unlimited matters",
			"10GB storage",
			"500MB max file size",
			"Priority support",
		],
		addonsDescription: ["$5/extra member", "$2/GB extra storage"],
	},
	pro: {
		name: "Professional",
		slug: { monthly: "pro-monthly", yearly: "pro-yearly" },
		monthlyPrice: 7900,
		yearlyPrice: 79000,
		limits: planLimits.pro,
		hasAddons: true,
		addonPricing: addonPricing.pro,
		popular: false,
		cta: "Select Plan",
		features: [
			"Up to 25 team members",
			"Unlimited teams",
			"Unlimited matters",
			"30GB storage",
			"500MB max file size",
			"Priority support",
		],
		addonsDescription: ["$4/extra member", "$1/GB extra storage"],
	},
	enterprise: {
		name: "Enterprise",
		slug: "enterprise",
		monthlyPrice: null,
		yearlyPrice: null,
		limits: planLimits.enterprise,
		hasAddons: false,
		contactSales: true,
		popular: false,
		cta: "Contact Sales",
		features: [
			"Unlimited team members",
			"Unlimited teams",
			"Unlimited matters",
			"Unlimited storage",
			"1GB max file size",
			"24/7 dedicated support",
			"Custom workflows",
			"Custom analytics",
			"API access",
			"SSO/SAML",
			"SLA",
		],
	},
} as const;

export type Product = (typeof products)[ProductKey];

// =============================================================================
// HELPERS
// =============================================================================

export const getCheckoutSlug = (
	plan: ProductKey,
	interval: BillingInterval,
): string | null => {
	if (plan === "starter" || plan === "enterprise") return null;
	const slug = products[plan].slug;
	return typeof slug === "string" ? slug : slug[interval];
};

export const getPrice = (
	plan: ProductKey,
	interval: BillingInterval,
): number | null =>
	interval === "yearly"
		? products[plan].yearlyPrice
		: products[plan].monthlyPrice;

export const getMonthlyEquivalent = (yearlyPrice: number): number =>
	Math.round(yearlyPrice / 12);

export const getYearlySavings = (
	monthlyPrice: number,
	yearlyPrice: number,
): number => {
	const yearlyFromMonthly = monthlyPrice * 12;
	if (yearlyFromMonthly === 0) {
		return 0;
	}
	return Math.round(
		((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100,
	);
};

export const canCheckout = (plan: ProductKey): boolean =>
	plan === "growth" || plan === "pro";
