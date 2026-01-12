import {
	getPlanByProductId,
	type ProductKey,
	planLimits,
	usagePricing,
} from "~/lib/billing";
import { getOrganizationMatterCount } from "~/lib/server/prepared-queries.server";
import {
	getOrganizationUsage, // Renamed from prepared import in original, now from cache
} from "./cache";
import { getOrganizationSubscription } from "./repository";
import type { PlanUsage } from "./types";

export interface PlanLimitCheck {
	withinLimits: boolean;
	usage: PlanUsage;
	effectivePlan: ProductKey;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		matters?: { current: number; limit: number };
		// storage?: { current: number; limit: number };
	};
}

/**
 * Returns true when a cancelled/expired subscription's period has ended.
 * If `defaultForMissingEnd` is true and `currentPeriodEnd` is missing, treat as ended.
 * Default is false (benefit of doubt when end date missing).
 */
function hasSubscriptionPeriodEnded(
	subscription: {
		status?: string | null;
		currentPeriodEnd?: string | Date | null;
	},
	defaultForMissingEnd = false,
): boolean {
	const isCancelled =
		subscription?.status === "cancelled" || subscription?.status === "expired";
	if (!isCancelled) return false;
	if (!subscription?.currentPeriodEnd) return defaultForMissingEnd;
	return new Date(subscription.currentPeriodEnd) < new Date();
}

/**
 * Check if an organization's usage is within plan limits
 * Strict enforcement for Cancelled/Expired plans
 */
export async function checkPlanLimits(
	organizationId: string,
	planKey?: ProductKey,
): Promise<PlanLimitCheck> {
	const subscription = await getOrganizationSubscription(organizationId);
	let effectivePlan: ProductKey = planKey ?? "starter";

	if (subscription) {
		if (hasSubscriptionPeriodEnded(subscription)) {
			// If cancelled AND period ended, enforce Starter limits (or Strict 0?)
			// User requested "Soft Enforcement", so Starter is a good fallback "Free Tier".
			effectivePlan = "starter";
		} else {
			// Active or Cancelled-but-in-period
			effectivePlan =
				subscription.planKey &&
				["starter", "growth", "pro", "enterprise"].includes(
					subscription.planKey,
				)
					? (subscription.planKey as ProductKey)
					: "starter";
		}
	}

	// Avoid mutating the cached usage object
	const usage = { ...(await getOrganizationUsage(organizationId)) };
	// Ensure matters usage is populated (fallback to prepared query if missing)
	if (typeof usage.matters !== "number") {
		const matterResult = await getOrganizationMatterCount.execute({
			orgId: organizationId,
		});
		usage.matters = matterResult[0]?.count ?? 0;
	}
	const limits = planLimits[effectivePlan];

	const violations: PlanLimitCheck["violations"] = {};
	let withinLimits = true;

	// Check members limit (-1 means unlimited)
	if (limits.members !== -1 && usage.members > limits.members) {
		violations.members = { current: usage.members, limit: limits.members };
		withinLimits = false;
	}

	// Check teams limit
	if (limits.teams !== -1 && usage.teams > limits.teams) {
		violations.teams = { current: usage.teams, limit: limits.teams };
		withinLimits = false;
	}

	// Check matters limit
	if (limits.matters !== -1 && usage.matters > limits.matters) {
		violations.matters = { current: usage.matters, limit: limits.matters };
		withinLimits = false;
	}

	return {
		withinLimits,
		usage,
		effectivePlan,
		limits,
		violations,
	};
}

/**
 * Get the effective plan key for an organization
 * Used for UI display, NOT for strict limit checks (use checkPlanLimits)
 */
export async function getOrganizationPlanKey(
	organizationId: string,
): Promise<ProductKey> {
	const subscription = await getOrganizationSubscription(organizationId);

	// No subscription = starter plan
	if (!subscription) return "starter";

	// If cancelled/expired and period ended, they deemed 'starter' effectively
	if (hasSubscriptionPeriodEnded(subscription)) return "starter";

	// Use stored planKey first (set during webhook processing)
	if (subscription.planKey) {
		return subscription.planKey as ProductKey;
	}

	// Fallback: resolve from productId (for legacy subscriptions)
	if (subscription.productId) {
		return getPlanByProductId(subscription.productId) ?? "starter";
	}

	return "starter";
}

/**
 * Check if adding a new member is allowed
 * Implements "Soft Enforcement": Block only if currently over limit.
 */
export async function canAddMember(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
	message?: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	const usage = limitCheck.usage;

	// Unlimited members
	if (limits.members === -1) {
		return {
			allowed: true,
			currentCount: usage.members,
			limit: -1,
		};
	}

	// Strict Check: Are we ALREADY at or over the limit?
	if (usage.members >= limits.members) {
		const sub = await getOrganizationSubscription(organizationId);
		const planKey = sub?.planKey as ProductKey | undefined;
		const isActivePaid =
			sub?.status === "active" && planKey && planKey !== "starter";

		if (isActivePaid) {
			// Allow overage for paid plans (billable)
			return {
				allowed: true,
				currentCount: usage.members,
				limit: limits.members,
				isOverage: true,
				message: `Adding this member will cost extra.`,
			};
		}

		// Block for Free/Starter/Cancelled
		return {
			allowed: false,
			reason: `You have reached the member limit for your plan (${limits.members}). Upgrade to add more.`,
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
		message: `This member is included in your plan`,
	};
}

/**
 * Get current member count and plan limit for an organization
 */
export async function getMemberCount(organizationId: string): Promise<{
	currentMembers: number;
	planLimit: number;
	plan: string;
	effectivePlan: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const planKey = await getOrganizationPlanKey(organizationId); // UI Plan

	return {
		currentMembers: limitCheck.usage.members,
		planLimit: limitCheck.limits.members,
		plan: planKey,
		effectivePlan: limitCheck.effectivePlan,
	};
}

/**
 * Get organization's current plan
 */
export async function getOrganizationPlan(
	organizationId: string,
): Promise<ProductKey> {
	return getOrganizationPlanKey(organizationId);
}

/**
 * Check if creating a new team is allowed
 */
export async function canCreateTeam(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	const usage = limitCheck.usage;

	// Unlimited teams
	if (limits.teams === -1) {
		return {
			allowed: true,
			currentCount: usage.teams,
			limit: -1,
		};
	}

	// Strict "Roach Motel" check
	if (usage.teams >= limits.teams) {
		// Allow overage for paid plans (both Growth and Pro have unlimited teams in planLimits,
		// but this check exists for potential future tiered limits with usage-based pricing).

		const sub = await getOrganizationSubscription(organizationId);
		const isActivePaid =
			sub?.status === "active" &&
			(sub.planKey === "pro" || sub.planKey === "growth");

		if (isActivePaid) {
			return {
				allowed: true,
				currentCount: usage.teams,
				limit: limits.teams,
				isOverage: true,
			};
		}

		return {
			allowed: false,
			reason: `You have reached the team limit (${limits.teams}). Upgrade to add more.`,
			currentCount: usage.teams,
			limit: limits.teams,
		};
	}

	return {
		allowed: true,
		currentCount: usage.teams,
		limit: limits.teams,
	};
}

/**
 * Check if creating a new matter (task) is allowed
 */
export async function canCreateMatter(organizationId: string) {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	// usage.matters is populated from prepared statements (ensured in checkPlanLimits)
	const usage = limitCheck.usage;

	if (limits.matters === -1) {
		return {
			allowed: true,
			currentCount: usage.matters,
			limit: -1,
		};
	}

	if (usage.matters >= limits.matters) {
		return {
			allowed: false,
			reason: `You have reached the matter limit (${limits.matters}). Upgrade for unlimited matters.`,
			currentCount: usage.matters,
			limit: limits.matters,
		};
	}

	return {
		allowed: true,
		currentCount: usage.matters,
		limit: limits.matters,
	};
}

/**
 * Handle subscription downgrade - check if current usage exceeds new plan limits
 * Returns violations that need to be addressed
 */
export async function handleSubscriptionDowngrade(
	organizationId: string,
	newPlanKey: ProductKey,
): Promise<{
	canDowngrade: boolean;
	violations: PlanLimitCheck["violations"];
	message?: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId, newPlanKey);

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
		if (limitCheck.violations.matters) {
			messages.push(
				`Remove ${limitCheck.violations.matters.current - limitCheck.violations.matters.limit} matters`,
			);
		}

		return {
			canDowngrade: false,
			violations: limitCheck.violations,
			message: `To downgrade to ${newPlanKey}, you need to: ${messages.join(", ")}`,
		};
	}

	return {
		canDowngrade: true,
		violations: {},
	};
}

/**
 * Get the member addition product slug for a plan
 */
export function getMemberProductSlug(plan: string): string {
	switch (plan) {
		case "starter":
			return "member-add-starter";
		case "growth":
			return "member-add-growth";
		case "pro":
			return "member-add-pro";
		case "enterprise":
			return "member-add-enterprise";
		default:
			return "member-add-starter";
	}
}

/**
 * Get member addition price for a plan (in cents)
 */
export function getMemberPrice(plan: string): number {
	// Check if plan has specific pricing
	if (plan === "growth" || plan === "pro") {
		return usagePricing[plan].memberSeat;
	}

	// Default fallbacks
	return 500;
}

/**
 * Get comprehensive billing status for an organization
 * Used for checking limits and displaying usage in UI
 */
export async function getBillingStatus(organizationId: string) {
	const [memberCheck, teamCheck, usage] = await Promise.all([
		canAddMember(organizationId),
		canCreateTeam(organizationId),
		getOrganizationUsage(organizationId),
	]);

	const planKey = await getOrganizationPlanKey(organizationId);
	const limits = planLimits[planKey];

	// Determine overage prices
	let teamPriceCents: number | null = null;
	if (planKey === "growth" || planKey === "pro") {
		teamPriceCents = usagePricing[planKey].teamCreated;
	}
	const memberPriceCents = getMemberPrice(planKey);

	return {
		// Plan information
		plan: planKey,
		limits,
		usage,

		// Member information
		members: {
			allowed: memberCheck.allowed,
			requiresPayment: memberCheck.isOverage ?? false,
			message: memberCheck.message,
			priceCents: memberPriceCents,
			current: usage.members,
			limit: limits.members,
		},

		// Team information
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
