/**
 * Billing limit enforcement for Zero mutators
 * These functions use raw SQL since Zero mutators run server-side
 * with access to tx.dbTransaction
 */

import { planLimits } from "~/config/billing";
import type { MutatorTx } from "./mutator-helpers";

// Map plan limits from canonical source for Zero mutators
const PLAN_LIMITS = {
	starter: {
		maxMembers: planLimits.starter.members,
		maxTeams: planLimits.starter.teams,
		maxMatters: planLimits.starter.matters,
	},
	growth: {
		maxMembers: planLimits.growth.members,
		maxTeams: planLimits.growth.teams,
		maxMatters: planLimits.growth.matters,
	},
	pro: {
		maxMembers: planLimits.pro.members,
		maxTeams: planLimits.pro.teams,
		maxMatters: planLimits.pro.matters,
	},
	enterprise: {
		maxMembers: planLimits.enterprise.members,
		maxTeams: planLimits.enterprise.teams,
		maxMatters: planLimits.enterprise.matters,
	},
} as const;

type PlanKey = keyof typeof PLAN_LIMITS;

/**
 * Get the effective plan for an organization
 * Uses stored planKey first, falls back to 'starter' if no subscription
 */
export async function getOrgPlan(
	tx: MutatorTx,
	orgId: string,
): Promise<PlanKey> {
	if (tx.location !== "server") {
		return "enterprise"; // Client-side: optimistic
	}

	const result = await tx.dbTransaction.query(
		`SELECT plan_key, status, current_period_end FROM subscriptions 
		 WHERE organization_id = $1 
		 ORDER BY created_at DESC 
		 LIMIT 1`,
		[orgId],
	);

	const rows = Array.from(
		result as unknown as Array<{
			plan_key?: string;
			status?: string;
			current_period_end?: Date;
		}>,
	);
	const sub = rows[0];

	if (!sub) return "starter";

	// Cancellation Strict Enforcement
	if (sub.status === "cancelled" || sub.status === "expired") {
		const periodEnded = sub.current_period_end
			? new Date(sub.current_period_end) < new Date()
			: true;
		if (periodEnded) return "starter";
	}

	// Use plan_key if valid
	if (sub.plan_key && sub.plan_key in PLAN_LIMITS) {
		return sub.plan_key as PlanKey;
	}

	return "starter";
}

/**
 * Check if the organization can create a new team
 * Returns void or throws an error
 */
export async function assertCanCreateTeam(tx: MutatorTx, orgId: string) {
	if (tx.location !== "server") {
		return; // Client-side: optimistic
	}

	const plan = await getOrgPlan(tx, orgId);
	const limits = PLAN_LIMITS[plan];

	if (limits.maxTeams === -1) {
		return;
	}

	const countResult = await tx.dbTransaction.query(
		`SELECT COUNT(*)::int as count FROM teams WHERE org_id = $1`,
		[orgId],
	);
	const rows = Array.from(countResult as unknown as Array<{ count: number }>);
	const currentCount = rows[0]?.count ?? 0;

	if (currentCount >= limits.maxTeams) {
		// Allow overage for paid plans (usage-based billing)
		if (plan === "growth" || plan === "pro") {
			return;
		}

		throw new Error(
			`Team limit reached. Your ${plan} plan allows ${limits.maxTeams} teams. Please upgrade to create more teams.`,
		);
	}
}

/**
 * Check if the organization can create a new matter (task/request)
 */
export async function assertCanCreateMatter(tx: MutatorTx, orgId: string) {
	if (tx.location !== "server") {
		return; // Client-side: optimistic
	}

	const plan = await getOrgPlan(tx, orgId);
	const limits = PLAN_LIMITS[plan];

	if (limits.maxMatters === -1) {
		return;
	}

	const countResult = await tx.dbTransaction.query(
		`SELECT COUNT(*)::int as count FROM matters WHERE org_id = $1`,
		[orgId],
	);
	const rows = Array.from(countResult as unknown as Array<{ count: number }>);
	const currentCount = rows[0]?.count ?? 0;

	if (currentCount >= limits.maxMatters) {
		throw new Error(
			`Task/Matter limit reached. Your ${plan} plan allows ${limits.maxMatters} items. Please upgrade for unlimited.`,
		);
	}
}
