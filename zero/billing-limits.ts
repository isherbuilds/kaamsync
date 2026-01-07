/**
 * Billing limit enforcement for Zero mutators
 * These functions use raw SQL since Zero mutators run server-side
 * with access to tx.dbTransaction
 */

import type { MutatorTx } from "./mutator-helpers";

// Plan limits configuration - canonical values (mirror app/lib/billing.ts). Use -1 for unlimited
const PLAN_LIMITS = {
	starter: { maxMembers: 3, maxTeams: 5 },
	growth: { maxMembers: 10, maxTeams: -1 },
	pro: { maxMembers: 25, maxTeams: 15 },
	enterprise: { maxMembers: -1, maxTeams: -1 },
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

	try {
		const result = await tx.dbTransaction.query(
			`SELECT plan_key FROM subscriptions 
		 WHERE organization_id = $1 
		 AND status IN ('active', 'on_hold')
		 ORDER BY created_at DESC 
		 LIMIT 1`,
			[orgId],
		);

		const rows = Array.from(result as unknown as Array<{ plan_key?: string }>);
		const planKey = rows[0]?.plan_key;

		if (planKey && planKey in PLAN_LIMITS) {
			return planKey as PlanKey;
		}

		return "starter";
	} catch (err) {
		console.error(`[Billing] getOrgPlan error:`, err);
		return "starter";
	}
}

/**
 * Check if the organization can create a new team
 * Returns { allowed: true } or throws an error
 */
export async function assertCanCreateTeam(
	tx: MutatorTx,
	orgId: string,
): Promise<void> {
	if (tx.location !== "server") {
		return; // Client-side: optimistic
	}

	try {
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
			if (plan === "growth" || plan === "pro") {
				console.log(
					`[Billing] Overage: ${plan} org creating team ${currentCount + 1}/${limits.maxTeams}`,
				);
				return;
			}

			console.log(
				`[Billing] BLOCKED: ${plan} at limit (${currentCount}/${limits.maxTeams})`,
			);
			throw new Error(
				`Team limit reached. Your ${plan} plan allows ${limits.maxTeams} teams. Please upgrade to create more teams.`,
			);
		}
	} catch (err) {
		if (err instanceof Error && err.message.includes("Team limit reached")) {
			throw err;
		}
		console.error(`[Billing] assertCanCreateTeam error:`, err);
	}
}

/**
 * Check if the organization can add a new member
 * This is for team membership, not org membership (which goes through Better Auth)
 */
export async function assertCanAddTeamMember(
	_tx: MutatorTx,
	_orgId: string,
): Promise<void> {
	// Team membership doesn't count toward org member limits
	// Org members are managed through Better Auth invitations
	// No billing check needed here - just permission checks
	return;
}
