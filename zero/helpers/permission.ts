/**
 * Permission helpers for Zero mutators.
 *
 * This module provides authentication, authorization, and billing limit
 * enforcement utilities for mutator operations.
 */

import {
	getEffectiveMemberLimit,
	type ProductKey,
	planLimits,
} from "~/config/billing";
import { matterType, orgRole, type TeamRole, teamRole } from "~/db/helpers";
import {
	hasRequestCreationPermission,
	hasTaskCreationPermission,
	PERMISSION_ERRORS,
} from "~/lib/auth/permissions";
import type { Context } from "../auth";
import { zql } from "../schema";
import type { MutatorTx } from "./mutator";

export { PERMISSION_ERRORS };

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Ensures the user is authenticated with an active organization.
 * Throws if userId or activeOrganizationId is missing.
 */
export function requireAuthentication(ctx: Context): asserts ctx is Context & {
	userId: string;
	activeOrganizationId: string;
} {
	if (!ctx.activeOrganizationId || !ctx.userId) {
		throw new Error(PERMISSION_ERRORS.NOT_LOGGED_IN);
	}
}

// ============================================================================
// SUBSCRIPTION & BILLING CHECKS
// ============================================================================

/**
 * Returns true if user has an active paid subscription (not starter plan).
 */
function hasActivePaidSubscription(ctx: Context): boolean {
	return (
		ctx.subscription?.plan !== "starter" &&
		ctx.subscription?.status === "active"
	);
}

/**
 * Enforces resource limits for users on the starter plan.
 * Paid users bypass this check.
 */
function enforceStarterPlanLimit(ctx: Context, resource: "teams" | "matters") {
	if (hasActivePaidSubscription(ctx)) return;
	const count = ctx.usage?.[resource];
	const limit = planLimits.starter[resource];
	if (count !== undefined && count >= limit) {
		const label = resource === "matters" ? "Matter" : "Team";
		throw new Error(`${label} limit reached. Please upgrade your plan.`);
	}
}

/**
 * Enforces member seat limits based on plan and purchased seats.
 */
function enforceMemberSeatLimit(ctx: Context) {
	const count = ctx.usage?.members;
	const plan = (ctx.subscription?.plan as ProductKey) ?? "starter";
	const purchasedSeats = ctx.subscription?.purchasedSeats ?? 0;
	const limit = getEffectiveMemberLimit(plan, purchasedSeats);

	// -1 means unlimited
	if (limit === -1) return;
	if (count !== undefined && count >= limit) {
		throw new Error("Member limit reached. Please upgrade your plan.");
	}
}

// ============================================================================
// MEMBERSHIP LOOKUPS
// ============================================================================

/**
 * Finds a user's team membership record.
 * Returns null if not a member.
 */
export async function findTeamMembership(
	tx: MutatorTx,
	ctx: Context,
	teamId: string,
) {
	requireAuthentication(ctx);
	return tx.run(
		zql.teamMembershipsTable
			.where("teamId", teamId)
			.where("userId", ctx.userId)
			.where("orgId", ctx.activeOrganizationId)
			.where("deletedAt", "IS", null)
			.one(),
	);
}

/**
 * Finds a user's organization membership record.
 * Throws if user is not a member of the organization.
 */
export async function findOrganizationMembership(
	tx: MutatorTx,
	ctx: Context,
	orgId: string,
) {
	requireAuthentication(ctx);
	const m = await tx.run(
		zql.membersTable
			.where("organizationId", orgId)
			.where("userId", ctx.userId)
			.one(),
	);
	if (!m) throw new Error(PERMISSION_ERRORS.NOT_ORG_MEMBER);
	return m;
}

// ============================================================================
// ROLE REQUIREMENTS
// ============================================================================

/**
 * Requires user to be a team member, optionally with a specific role.
 * Throws if user is not a member or lacks the required role.
 */
export async function requireTeamRole(
	tx: MutatorTx,
	ctx: Context,
	teamId: string,
	requiredRole?: TeamRole,
) {
	const m = await findTeamMembership(tx, ctx, teamId);

	if (!m) throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);

	if (requiredRole && m.role !== requiredRole) {
		throw new Error(PERMISSION_ERRORS.NO_APPROPRIATE_ROLE);
	}

	return m;
}

// ============================================================================
// MATTER PERMISSIONS
// ============================================================================

/**
 * Checks if the user can modify a specific matter.
 * Returns matter details and modification permissions.
 */
export async function checkMatterModifyAccess(
	tx: MutatorTx,
	ctx: Context,
	matterId: string,
	opts?: { deleted?: boolean },
) {
	requireAuthentication(ctx);

	const baseQuery = zql.mattersTable
		.where("id", matterId)
		.where("orgId", ctx.activeOrganizationId);

	const matter = await tx.run(
		opts?.deleted
			? baseQuery.where("deletedAt", "IS NOT", null).one()
			: baseQuery.where("deletedAt", "IS", null).one(),
	);

	if (!matter) throw new Error(PERMISSION_ERRORS.MATTER_NOT_FOUND);

	const membership = await findTeamMembership(tx, ctx, matter.teamId);
	if (!membership) throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);

	const isManager = membership.role === teamRole.manager;
	const canModify =
		matter.authorId === ctx.userId ||
		matter.assigneeId === ctx.userId ||
		isManager;

	return { matter, membership, canModify, isManager };
}

// ============================================================================
// CREATION PERMISSIONS (combines role checks with billing limits)
// ============================================================================

/**
 * Enforces team creation permissions.
 * Requires owner/admin role and checks starter plan limits.
 */
export function enforceTeamCreationPermission(
	ctx: Context,
	organizationRole: string,
) {
	if (
		organizationRole !== orgRole.owner &&
		organizationRole !== orgRole.admin
	) {
		throw new Error(PERMISSION_ERRORS.NO_APPROPRIATE_ROLE);
	}
	enforceStarterPlanLimit(ctx, "teams");
}

/**
 * Enforces matter creation permissions.
 * Checks role-based permissions and starter plan limits.
 */
export function enforceMatterCreationPermission(
	ctx: Context,
	teamRole: string,
	type: string,
) {
	if (
		type === matterType.task &&
		!hasTaskCreationPermission(teamRole as TeamRole)
	) {
		throw new Error(PERMISSION_ERRORS.MANAGER_REQUIRED);
	}
	if (
		type === matterType.request &&
		!hasRequestCreationPermission(teamRole as TeamRole)
	) {
		throw new Error(PERMISSION_ERRORS.NO_APPROPRIATE_ROLE);
	}
	enforceStarterPlanLimit(ctx, "matters");
}

/**
 * Enforces member addition limits based on plan.
 */
export function enforceMemberAdditionLimit(ctx: Context) {
	enforceMemberSeatLimit(ctx);
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export function clearOrganizationUsageCache(
	ctx: Context,
	orgId: string,
	metric?: "members" | "teams" | "matters" | "storage" | "all",
): void {
	ctx.clearUsageCache?.(orgId, metric);
}
