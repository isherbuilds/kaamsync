/**
 * Server-side plan enforcement helpers for Zero mutators
 *
 * These functions check organization plan limits before allowing certain operations.
 * They're designed to be called from Zero mutators to enforce business rules.
 */

import { getPlanLimits, PLAN_ID, type PlanId } from "~/lib/pricing";
import type { MutatorTx } from "./mutator-helpers";
import { zql } from "./schema";

/**
 * Get plan ID from organization (reads from proper column)
 */
export function getOrgPlan(org: { plan?: string | null }): PlanId {
	// Primary: read from plan column
	if (org.plan && Object.values(PLAN_ID).includes(org.plan as PlanId)) {
		return org.plan as PlanId;
	}

	return PLAN_ID.STARTER;
}

/**
 * Check if organization can create more teams based on their plan
 */
export async function canCreateTeam(
	tx: MutatorTx,
	organizationId: string,
): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount?: number;
	limit?: number | null;
	existingTeams?: any[];
}> {
	// Get organization with plan info
	const org = await tx.run(
		zql.organizationsTable.where("id", organizationId).one(),
	);

	if (!org) {
		return { allowed: false, reason: "Organization not found" };
	}

	const planId = getOrgPlan(org);
	const limits = getPlanLimits(planId);

	// Unlimited teams
	if (limits.maxTeams === null) {
		return { allowed: true, limit: null };
	}

	// Count existing teams
	const existingTeams = await tx.run(
		zql.teamsTable
			.where("orgId", organizationId)
			.where("archived", false)
			.where("deletedAt", "IS", null),
	);

	const currentCount = existingTeams.length;

	if (currentCount >= limits.maxTeams) {
		return {
			allowed: false,
			reason: `You've reached the ${limits.maxTeams} team limit on your plan. Please upgrade to add more teams.`,
			currentCount,
			limit: limits.maxTeams,
		};
	}

	return { allowed: true, currentCount, limit: limits.maxTeams, existingTeams };
}

/**
 * Check if organization can add more members based on their plan
 * Note: This is for organization members (membersTable), not team members
 */
export async function canAddOrgMember(
	tx: MutatorTx,
	organizationId: string,
): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount?: number;
	limit?: number | null;
}> {
	// Get organization with plan info
	const org = await tx.run(
		zql.organizationsTable.where("id", organizationId).one(),
	);

	if (!org) {
		return { allowed: false, reason: "Organization not found" };
	}

	const planId = getOrgPlan(org);
	const limits = getPlanLimits(planId);

	// Unlimited members
	if (limits.maxMembers === null) {
		return { allowed: true, limit: null };
	}

	// Count existing members
	const existingMembers = await tx.run(
		zql.membersTable.where("organizationId", organizationId),
	);

	const currentCount = existingMembers.length;

	if (currentCount >= limits.maxMembers) {
		return {
			allowed: false,
			reason: `You've reached the ${limits.maxMembers} member limit on your plan. Please upgrade to add more members.`,
			currentCount,
			limit: limits.maxMembers,
		};
	}

	return { allowed: true, currentCount, limit: limits.maxMembers };
}

/**
 * Check if a feature is available for the organization's plan
 */
export async function checkFeatureAccess(
	tx: MutatorTx,
	organizationId: string,
	feature:
		| "approvalWorkflows"
		| "prioritySupport"
		| "sso"
		| "customIntegrations",
): Promise<{ allowed: boolean; reason?: string }> {
	const org = await tx.run(
		zql.organizationsTable.where("id", organizationId).one(),
	);

	if (!org) {
		return { allowed: false, reason: "Organization not found" };
	}

	const planId = getOrgPlan(org);
	const limits = getPlanLimits(planId);

	const featureMap: Record<string, boolean> = {
		approvalWorkflows: limits.hasApprovalWorkflows,
		prioritySupport: limits.hasPrioritySupport,
		sso: limits.hasSSO,
		customIntegrations: limits.hasCustomIntegrations,
	};

	if (!featureMap[feature]) {
		return {
			allowed: false,
			reason: `This feature requires a higher plan. Please upgrade to access ${feature}.`,
		};
	}

	return { allowed: true };
}

/**
 * Get organization's current plan details
 */
export async function getOrgPlanDetails(
	tx: MutatorTx,
	organizationId: string,
): Promise<{
	planId: PlanId;
	limits: ReturnType<typeof getPlanLimits>;
	teamCount: number;
	memberCount: number;
}> {
	const [org, teams, members] = await Promise.all([
		tx.run(zql.organizationsTable.where("id", organizationId).one()),
		tx.run(
			zql.teamsTable
				.where("orgId", organizationId)
				.where("archived", false)
				.where("deletedAt", "IS", null),
		),
		tx.run(zql.membersTable.where("organizationId", organizationId)),
	]);

	const planId = getOrgPlan(org ?? {});
	const limits = getPlanLimits(planId);

	return {
		planId,
		limits,
		teamCount: teams.length,
		memberCount: members.length,
	};
}
