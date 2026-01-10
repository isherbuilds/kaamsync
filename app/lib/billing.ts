import { createId } from "@paralleldrive/cuid2";
import DodoPayments from "dodopayments";

// Safe environment variable access (server-side only)
const isServer = typeof window === "undefined";

// Dynamic import to avoid issues with client-side bundling
let envModule: typeof import("~/lib/server/env-validation.server") | null =
	null;

if (isServer) {
	try {
		envModule = require("~/lib/server/env-validation.server");
	} catch {
		// Fallback for when env validation hasn't run yet
	}
}

const apiKey = isServer
	? envModule?.env?.DODO_PAYMENTS_API_KEY || process.env.DODO_PAYMENTS_API_KEY
	: undefined;
const webhookSecret = isServer
	? envModule?.env?.DODO_PAYMENTS_WEBHOOK_SECRET ||
		process.env.DODO_PAYMENTS_WEBHOOK_SECRET
	: undefined;
const environment = (
	isServer
		? envModule?.env?.DODO_PAYMENTS_ENVIRONMENT ||
			process.env.DODO_PAYMENTS_ENVIRONMENT ||
			"test_mode"
		: "test_mode"
) as "test_mode" | "live_mode";
const siteUrl = isServer
	? envModule?.env?.SITE_URL || process.env.SITE_URL || "http://localhost:3000"
	: "";

// Dodo Payments client singleton (server-side only)
export const dodoPayments =
	isServer && apiKey
		? new DodoPayments({
				bearerToken: apiKey,
				environment,
			})
		: null;

// API base URL based on environment
const apiBaseUrl =
	environment === "live_mode"
		? "https://api.dodopayments.com"
		: "https://test.dodopayments.com";

// Billing configuration
export const billingConfig = {
	apiKey,
	webhookSecret,
	environment,
	apiBaseUrl,
	enabled: !!(apiKey && webhookSecret),
	returnUrl: `${siteUrl}/api/billing/redirect`,
	successUrl: `${siteUrl}/api/billing/redirect?success=true`,
	cancelUrl: `${siteUrl}/api/billing/redirect?cancelled=true`,
} as const;

// Plan limits configuration
export const planLimits = {
	starter: {
		members: 3,
		teams: 5,
		storageGb: 0.5,
		matters: 250, // Limit matters/tasks for free tier
	},
	growth: {
		members: 10,
		teams: -1, // -1 = unlimited
		storageGb: 10,
		matters: -1,
	},
	pro: {
		members: 25,
		teams: -1, // Match Growth, Pro should be better
		storageGb: 25,
		matters: -1,
	},
	enterprise: {
		members: -1, // unlimited
		teams: -1, // unlimited
		storageGb: -1, // unlimited/custom
		matters: -1,
	},
} as const;

// Usage meter event names (matching your Dodo dashboard meters)
export const meterEvents = {
	memberSeat: "member.seat",
	teamCreated: "team.created",
	storageGb: "storage.gb",
} as const;

// Usage-based pricing per plan tier (in cents)
// These are the overage rates when users exceed included limits
export const usagePricing = {
	growth: {
		memberSeat: 500, // $5/member
		teamCreated: 300, // $3/team
		storageGb: 200, // $2/GB
	},
	pro: {
		memberSeat: 400, // $4/member (cheaper for Pro)
		teamCreated: 200, // $2/team
		storageGb: 100, // $1/GB
	},
} as const;

export type BillingInterval = "monthly" | "yearly";

// Product configuration with monthly and yearly options
// Note: Product IDs are configured directly in auth.ts - only slugs are needed here for checkout
export const products = {
	starter: {
		name: "Starter",
		slug: "starter",
		monthlyPrice: 0,
		yearlyPrice: 0,
		limits: planLimits.starter,
		popular: false,
		usageBased: false,
		features: [
			"Up to 3 team members",
			"5 individual teams",
			"500MB secure storage",
			"Basic matter tracking",
			"Standard support",
		],
		cta: "Get Started",
	},
	growth: {
		name: "Growth",
		slug: {
			monthly: "growth-monthly",
			yearly: "growth-yearly",
		},
		monthlyPrice: 2900, // $29/month
		yearlyPrice: 29000, // $290/year (~$24.17/month, ~17% savings)
		limits: planLimits.growth,
		popular: true,
		usageBased: true,
		usagePricing: usagePricing.growth,
		features: [
			"Includes up to 10 members",
			"Unlimited teams",
			"Includes 10GB storage",
			"Audit Logs",
			"Priority email support",
			"$5/month per additional member",
		],
		addonsDescription: ["+$5/member", "+$2/GB storage"],
		cta: "Start Growing",
	},
	pro: {
		name: "Professional",
		slug: {
			monthly: "pro-monthly",
			yearly: "pro-yearly",
		},
		monthlyPrice: 7900, // $79/month
		yearlyPrice: 79000, // $790/year (~$65.83/month, ~17% savings)
		limits: planLimits.pro,
		popular: false,
		usageBased: true,
		usagePricing: usagePricing.pro,
		features: [
			"Includes up to 25 members",
			"Unlimited teams",
			"Includes 25GB storage",
			"Audit logs",
			"Priority support",
			"$4/month per additional member",
		],
		addonsDescription: ["+$4/member", "+$1/GB storage"],
		cta: "Go Pro",
	},
	enterprise: {
		name: "Enterprise",
		slug: "enterprise",
		monthlyPrice: null,
		yearlyPrice: null,
		limits: planLimits.enterprise,
		popular: false,
		usageBased: false,
		features: [
			"Unlimited team members",
			"Unlimited teams",
			"Unlimited storage",
			"Dedicated account manager",
			"Custom integrations",
			"On-premise deployment option",
			"24/7 phone & email support",
			"Everything Customizable",
		],
		cta: "Contact Sales",
		contactSales: true,
	},
} as const;

export type ProductKey = keyof typeof products;
export type Product = (typeof products)[ProductKey];

// Server-only product ID mapping
// These are only accessible on the server where process.env is available
export const productIds = isServer
	? {
			growth: {
				monthly: process.env.DODO_PRODUCT_GROWTH_MONTHLY || "",
				yearly: process.env.DODO_PRODUCT_GROWTH_YEARLY || "",
			},
			pro: {
				monthly: process.env.DODO_PRODUCT_PROFESSIONAL_MONTHLY || "",
				yearly: process.env.DODO_PRODUCT_PROFESSIONAL_YEARLY || "",
			},
		}
	: null;

// Helper to find plan key by product ID (works on both client and server)
export function getPlanByProductId(productId: string): ProductKey | null {
	if (!productId || !isServer || !productIds) return null;

	if (
		productIds.growth.monthly === productId ||
		productIds.growth.yearly === productId
	) {
		return "growth";
	}
	if (
		productIds.pro.monthly === productId ||
		productIds.pro.yearly === productId
	) {
		return "pro";
	}
	return null;
}

// Helper to check if a plan supports checkout
export function canCheckout(plan: ProductKey): boolean {
	if (plan === "starter" || plan === "enterprise") return false;
	// On the client, we assume growth and pro are available
	// Server-side validation will handle missing product IDs
	return plan === "growth" || plan === "pro";
}

// Helper to get the slug for checkout
export function getCheckoutSlug(
	plan: ProductKey,
	interval: BillingInterval,
): string | null {
	if (plan === "starter" || plan === "enterprise") return null;
	const product = products[plan];

	if (typeof product.slug === "string") return product.slug;
	return product.slug[interval] || null;
}

// Helper to get price for display
export function getPrice(
	plan: ProductKey,
	interval: BillingInterval,
): number | null {
	const product = products[plan];
	if (interval === "yearly") {
		return product.yearlyPrice;
	}
	return product.monthlyPrice;
}

// Helper to calculate monthly equivalent for yearly plans
export function getMonthlyEquivalent(yearlyPrice: number): number {
	return Math.round(yearlyPrice / 12);
}

// Helper to calculate savings percentage for yearly
export function getYearlySavings(
	monthlyPrice: number,
	yearlyPrice: number,
): number {
	const yearlyFromMonthly = monthlyPrice * 12;
	return Math.round(
		((yearlyFromMonthly - yearlyPrice) / yearlyFromMonthly) * 100,
	);
}

// Helper to format storage display
export function formatStorage(gb: number): string {
	if (gb < 1) {
		return `${gb * 1000}MB`;
	}
	return `${gb}GB`;
}

// Helper to get limit display text
export function getLimitDisplay(value: number, unit: string): string {
	if (value === -1) return `Unlimited ${unit}`;
	return `${value} ${unit}`;
}

// =============================================================================
// USAGE METERING
// =============================================================================

export interface UsageEvent {
	event_id: string;
	customer_id: string;
	event_name: string;
	timestamp: string;
	metadata?: Record<string, string | number>;
}

/**
 * Ingest usage events to Dodo Payments for metered billing
 * Use this to track member seats, team creation, and storage usage
 */
export async function ingestUsageEvents(events: UsageEvent[]): Promise<{
	success: boolean;
	error?: string;
}> {
	if (!dodoPayments) {
		console.warn(
			"[Billing] Cannot ingest events - Dodo Payments not initialized",
		);
		return { success: false, error: "Billing not configured" };
	}

	try {
		await dodoPayments.usageEvents.ingest({ events });
		return { success: true };
	} catch (error) {
		console.error("[Billing] Usage ingestion error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Report current total seat count for an organization
 * Uses 'Max' aggregation in Dodo - bills for peak usage in billing period
 *
 * Event format:
 * {
 *   "event_id": "<UNIQUE_ID>",
 *   "customer_id": "<CUSTOMER_ID>",
 *   "event_name": "member.seat",
 *   "timestamp": "2026-01-06T16:01:28.865Z",
 *   "metadata": { "seats": <VALUE> }
 * }
 *
 * @param customerId - The Dodo customer ID
 * @param totalSeats - Current total member count
 */
export async function reportSeatCount(
	customerId: string,
	totalSeats: number,
): Promise<boolean> {
	const result = await ingestUsageEvents([
		{
			event_id: createId(),
			customer_id: customerId,
			event_name: meterEvents.memberSeat,
			timestamp: new Date().toISOString(),
			metadata: {
				seats: totalSeats,
			},
		},
	]);
	return result.success;
}

/**
 * Track a team being created
 */
export async function trackTeamCreated(customerId: string): Promise<boolean> {
	const result = await ingestUsageEvents([
		{
			event_id: `team_${customerId}_${Date.now()}`,
			customer_id: customerId,
			event_name: meterEvents.teamCreated,
			timestamp: new Date().toISOString(),
		},
	]);
	return result.success;
}

/**
 * Track storage usage (in GB)
 * @param customerId - The Dodo customer ID
 * @param gbUsed - Amount of storage in GB
 */
export async function trackStorageUsage(
	customerId: string,
	gbUsed: number,
): Promise<boolean> {
	const result = await ingestUsageEvents([
		{
			event_id: `storage_${customerId}_${Date.now()}`,
			customer_id: customerId,
			event_name: meterEvents.storageGb,
			timestamp: new Date().toISOString(),
			metadata: {
				gb: gbUsed.toString(),
			},
		},
	]);
	return result.success;
}
