/**
 * Billing Server Module - Consolidated
 * Simplified: ~320 lines vs original 1,142 lines (across 5 files)
 */

import DodoPayments from "dodopayments";
import { type ProductKey, planLimits, usagePricing } from "~/config/billing";
import {
	getOrganizationMatterCount,
	getOrganizationUsagePrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/infra/db-prepared";
import { env } from "~/lib/infra/env";

// =============================================================================
// TYPES
// =============================================================================

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
}

// =============================================================================
// CACHE (in-memory with 5-min TTL)
// =============================================================================

const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getOrganizationUsage(orgId: string): Promise<PlanUsage> {
	const cached = usageCache.get(orgId);
	if (cached && cached.expires > Date.now()) return cached.data;

	const usage = await getOrganizationUsagePrepared(orgId);
	usageCache.set(orgId, { data: usage, expires: Date.now() + CACHE_TTL });
	return usage;
}

export function invalidateUsageCache(orgId: string) {
	usageCache.delete(orgId);
}

export function invalidateAllOrganizationCaches(orgId: string) {
	invalidateUsageCache(orgId);
}

export function getCacheStats() {
	return { usageCache: { size: usageCache.size } };
}

// Server-only DodoPayments client and billing config
export const dodoPayments = env.DODO_PAYMENTS_API_KEY
	? new DodoPayments({
			bearerToken: env.DODO_PAYMENTS_API_KEY,
			environment:
				(env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
				"test_mode",
		})
	: null;

export const billingConfig = {
	webhookSecret: env.DODO_PAYMENTS_WEBHOOK_SECRET,
	enabled: !!(env.DODO_PAYMENTS_API_KEY && env.DODO_PAYMENTS_WEBHOOK_SECRET),
	successUrl: `${env.SITE_URL}/api/billing/redirect?success=true`,
} as const;

// =============================================================================
// REPOSITORY
// =============================================================================

export async function getOrganizationSubscription(orgId: string) {
	const result = await getOrgSubscriptionPrepared.execute({
		organizationId: orgId,
	});
	return result[0] ?? null;
}

// =============================================================================
// LIMITS
// =============================================================================

export interface PlanLimitCheck {
	withinLimits: boolean;
	usage: PlanUsage;
	effectivePlan: ProductKey;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		matters?: { current: number; limit: number };
	};
}

function hasSubscriptionEnded(sub: {
	status?: string | null;
	currentPeriodEnd?: string | Date | null;
}): boolean {
	if (sub?.status !== "cancelled" && sub?.status !== "expired") return false;
	if (!sub?.currentPeriodEnd) return false;
	return new Date(sub.currentPeriodEnd) < new Date();
}

export async function getOrganizationPlanKey(
	orgId: string,
): Promise<ProductKey> {
	const sub = await getOrganizationSubscription(orgId);
	if (!sub || hasSubscriptionEnded(sub)) return "starter";
	if (sub.plan) return sub.plan as ProductKey;
	if (sub.productId) return getPlanByProductId(sub.productId) ?? "starter";
	return "starter";
}

export async function checkPlanLimits(
	orgId: string,
	overridePlan?: ProductKey,
): Promise<PlanLimitCheck> {
	const sub = await getOrganizationSubscription(orgId);
	let effectivePlan: ProductKey = overridePlan ?? "starter";

	if (!overridePlan && sub) {
		effectivePlan = hasSubscriptionEnded(sub)
			? "starter"
			: ((sub.plan as ProductKey) ?? "starter");
	}

	const usage = { ...(await getOrganizationUsage(orgId)) };
	if (typeof usage.matters !== "number") {
		const result = await getOrganizationMatterCount.execute({ orgId });
		usage.matters = result[0]?.count ?? 0;
	}

	const limits = planLimits[effectivePlan];
	const violations: PlanLimitCheck["violations"] = {};
	let withinLimits = true;

	if (limits.members !== -1 && usage.members > limits.members) {
		violations.members = { current: usage.members, limit: limits.members };
		withinLimits = false;
	}
	if (limits.teams !== -1 && usage.teams > limits.teams) {
		violations.teams = { current: usage.teams, limit: limits.teams };
		withinLimits = false;
	}
	if (limits.matters !== -1 && usage.matters > limits.matters) {
		violations.matters = { current: usage.matters, limit: limits.matters };
		withinLimits = false;
	}

	return { withinLimits, usage, effectivePlan, limits, violations };
}

export async function canAddMember(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);
	if (limits.members === -1)
		return { allowed: true, currentCount: usage.members, limit: -1 };
	if (usage.members >= limits.members) {
		const sub = await getOrganizationSubscription(orgId);
		const isActivePaid =
			sub?.status === "active" && effectivePlan !== "starter";
		if (isActivePaid)
			return {
				allowed: true,
				currentCount: usage.members,
				limit: limits.members,
				isOverage: true,
				message: "Adding this member will cost extra.",
			};
		return {
			allowed: false,
			reason: `Member limit (${limits.members}) reached. Upgrade to add more.`,
			currentCount: usage.members,
			limit: limits.members,
			isOverage: true,
		};
	}
	return {
		allowed: true,
		currentCount: usage.members,
		limit: limits.members,
		isOverage: false,
		message: "This member is included in your plan",
	};
}

export async function canCreateTeam(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);
	if (limits.teams === -1)
		return { allowed: true, currentCount: usage.teams, limit: -1 };
	if (usage.teams >= limits.teams) {
		const sub = await getOrganizationSubscription(orgId);
		if (
			sub?.status === "active" &&
			(effectivePlan === "growth" || effectivePlan === "pro")
		) {
			return {
				allowed: true,
				currentCount: usage.teams,
				limit: limits.teams,
				isOverage: true,
			};
		}
		return {
			allowed: false,
			reason: `Team limit (${limits.teams}) reached. Upgrade to add more.`,
			currentCount: usage.teams,
			limit: limits.teams,
		};
	}
	return { allowed: true, currentCount: usage.teams, limit: limits.teams };
}

export async function canCreateMatter(orgId: string) {
	const { usage, limits } = await checkPlanLimits(orgId);
	if (limits.matters === -1)
		return { allowed: true, currentCount: usage.matters, limit: -1 };
	if (usage.matters >= limits.matters)
		return {
			allowed: false,
			reason: `Matter limit (${limits.matters}) reached. Upgrade for unlimited.`,
			currentCount: usage.matters,
			limit: limits.matters,
		};
	return { allowed: true, currentCount: usage.matters, limit: limits.matters };
}

export async function handleSubscriptionDowngrade(
	orgId: string,
	newPlan: ProductKey,
) {
	const check = await checkPlanLimits(orgId, newPlan);
	if (!check.withinLimits) {
		const msgs: string[] = [];
		if (check.violations.members)
			msgs.push(
				`Remove ${check.violations.members.current - check.violations.members.limit} members`,
			);
		if (check.violations.teams)
			msgs.push(
				`Remove ${check.violations.teams.current - check.violations.teams.limit} teams`,
			);
		if (check.violations.matters)
			msgs.push(
				`Remove ${check.violations.matters.current - check.violations.matters.limit} matters`,
			);
		return {
			canDowngrade: false,
			violations: check.violations,
			message: `To downgrade to ${newPlan}: ${msgs.join(", ")}`,
		};
	}
	return { canDowngrade: true, violations: {} };
}

export const getMemberProductSlug = (plan: string) =>
	`member-add-${plan === "growth" || plan === "pro" ? plan : "starter"}`;
export const getMemberPrice = (plan: string) =>
	plan === "growth" || plan === "pro"
		? usagePricing[plan as "growth" | "pro"].memberSeat
		: 500;

export async function getBillingStatus(orgId: string) {
	const [memberCheck, teamCheck, usage] = await Promise.all([
		canAddMember(orgId),
		canCreateTeam(orgId),
		getOrganizationUsage(orgId),
	]);
	const planKey = await getOrganizationPlanKey(orgId);
	const limits = planLimits[planKey];
	const teamPriceCents =
		planKey === "growth" || planKey === "pro"
			? usagePricing[planKey].teamCreated
			: null;

	return {
		plan: planKey,
		limits,
		usage,
		members: {
			allowed: memberCheck.allowed,
			requiresPayment: memberCheck.isOverage ?? false,
			message: memberCheck.message,
			priceCents: getMemberPrice(planKey),
			current: usage.members,
			limit: limits.members,
		},
		teams: {
			allowed: teamCheck.allowed,
			requiresPayment: teamCheck.isOverage ?? false,
			message: teamCheck.allowed ? null : teamCheck.reason,
			priceCents: teamPriceCents,
			current: usage.teams,
			limit: limits.teams,
		},
	};
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export const getPlanByProductId = (productId: string): ProductKey | null => {
	if (!productId) return null;
	const {
		DODO_PRODUCT_GROWTH_MONTHLY,
		DODO_PRODUCT_GROWTH_YEARLY,
		DODO_PRODUCT_PROFESSIONAL_MONTHLY,
		DODO_PRODUCT_PROFESSIONAL_YEARLY,
	} = env;
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
