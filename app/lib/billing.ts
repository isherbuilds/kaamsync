/**
 * Billing configuration - shared between client and server
 * Simplified: ~130 lines vs original 414 lines
 */
import DodoPayments from "dodopayments";

const isServer = typeof window === "undefined";

// =============================================================================
// DODO PAYMENTS CLIENT (server-only)
// =============================================================================

export const dodoPayments =
	isServer && process.env.DODO_PAYMENTS_API_KEY
		? new DodoPayments({
				bearerToken: process.env.DODO_PAYMENTS_API_KEY,
				environment:
					(process.env.DODO_PAYMENTS_ENVIRONMENT as
						| "test_mode"
						| "live_mode") ?? "test_mode",
			})
		: null;

const siteUrl = isServer ? process.env.SITE_URL || "http://localhost:3000" : "";

export const billingConfig = {
	webhookSecret: isServer
		? process.env.DODO_PAYMENTS_WEBHOOK_SECRET
		: undefined,
	enabled: isServer
		? !!(
				process.env.DODO_PAYMENTS_API_KEY &&
				process.env.DODO_PAYMENTS_WEBHOOK_SECRET
			)
		: false,
	successUrl: `${siteUrl}/api/billing/redirect?success=true`,
} as const;

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
		maxFileSizeMb: 25,
		maxFiles: -1,
	},
	pro: {
		members: 25,
		teams: -1,
		matters: -1,
		storageGb: 25,
		maxFileSizeMb: 50,
		maxFiles: -1,
	},
	enterprise: {
		members: -1,
		teams: -1,
		matters: -1,
		storageGb: -1,
		maxFileSizeMb: 100,
		maxFiles: -1,
	},
} as const;

export type ProductKey = keyof typeof planLimits;
export type BillingInterval = "monthly" | "yearly";

// Overage pricing (cents)
export const usagePricing = {
	growth: { memberSeat: 500, teamCreated: 300, storageGb: 200 },
	pro: { memberSeat: 400, teamCreated: 200, storageGb: 100 },
} as const;

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
		popular: false,
		usageBased: false,
		features: [
			"Up to 3 team members",
			"5 individual teams",
			"Basic matter tracking",
			"Standard support",
		],
		cta: "Get Started",
	},
	growth: {
		name: "Growth",
		slug: { monthly: "growth-monthly", yearly: "growth-yearly" },
		monthlyPrice: 2900,
		yearlyPrice: 29000,
		limits: planLimits.growth,
		popular: true,
		usageBased: true,
		usagePricing: usagePricing.growth,
		features: [
			"Up to 10 members included",
			"Unlimited teams",
			"Audit Logs",
			"Priority support",
			"$5/month per extra member",
		],
		addonsDescription: ["+$5/member", "+$2/GB storage"],
		cta: "Start Growing",
	},
	pro: {
		name: "Professional",
		slug: { monthly: "pro-monthly", yearly: "pro-yearly" },
		monthlyPrice: 7900,
		yearlyPrice: 79000,
		limits: planLimits.pro,
		popular: false,
		usageBased: true,
		usagePricing: usagePricing.pro,
		features: [
			"Up to 25 members included",
			"Unlimited teams",
			"Audit logs",
			"Priority support",
			"$4/month per extra member",
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
			"Unlimited members",
			"Unlimited teams",
			"Dedicated account manager",
			"Custom integrations",
			"24/7 support",
		],
		cta: "Contact Sales",
		contactSales: true,
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

export const getPlanByProductId = (productId: string): ProductKey | null => {
	if (!isServer || !productId) return null;
	const {
		DODO_PRODUCT_GROWTH_MONTHLY,
		DODO_PRODUCT_GROWTH_YEARLY,
		DODO_PRODUCT_PROFESSIONAL_MONTHLY,
		DODO_PRODUCT_PROFESSIONAL_YEARLY,
	} = process.env;
	if (
		productId === DODO_PRODUCT_GROWTH_MONTHLY ||
		productId === DODO_PRODUCT_GROWTH_YEARLY
	)
		return "growth";
	if (
		productId === DODO_PRODUCT_PROFESSIONAL_MONTHLY ||
		productId === DODO_PRODUCT_PROFESSIONAL_YEARLY
	)
		return "pro";
	return null;
};

export const getMemberPrice = (plan: ProductKey): number =>
	plan === "growth" || plan === "pro" ? usagePricing[plan].memberSeat : 500;
