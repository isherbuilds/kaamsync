/**
 * Server-side permission helpers for Zero mutators.
 * Uses shared permission logic and error messages from app/lib/permissions.ts
 */

import { PERMISSION_ERRORS } from "~/lib/auth/permissions";
import type { Context } from "./auth";
import type { MutatorTx } from "./mutator-helpers";
import { zql } from "./schema";

// Re-export shared error messages
export { PERMISSION_ERRORS };

// ============================================================================
// CORE PERMISSION HELPERS
// ============================================================================

/**
 * Assert user is logged in with active organization
 */
export function assertLoggedIn(ctx: Context): asserts ctx is Context & {
	activeOrganizationId: string;
} {
	if (!ctx.activeOrganizationId) {
		throw new Error(PERMISSION_ERRORS.NOT_LOGGED_IN);
	}
}

/**
 * Get team membership for user with error handling
 */
export async function getTeamMembership(
	tx: MutatorTx,
	ctx: Context,
	teamId: string,
) {
	assertLoggedIn(ctx);
	return await tx.run(
		zql.teamMembershipsTable
			.where("teamId", teamId)
			.where("userId", ctx.userId)
			.where("orgId", ctx.activeOrganizationId)
			.where("deletedAt", "IS", null)
			.one(),
	);
}

/**
 * Assert user is a team member
 */
export async function assertTeamMember(
	tx: MutatorTx,
	ctx: Context,
	teamId: string,
) {
	const membership = await getTeamMembership(tx, ctx, teamId);
	if (!membership) {
		throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);
	}
	return membership;
}

/**
 * Assert user is a team manager
 */
export async function assertTeamManager(
	tx: MutatorTx,
	ctx: Context,
	teamId: string,
) {
	const membership = await assertTeamMember(tx, ctx, teamId);
	if (membership.role !== "manager") {
		throw new Error(PERMISSION_ERRORS.MANAGER_REQUIRED);
	}
	return membership;
}

// ============================================================================
// MATTER PERMISSION HELPERS
// ============================================================================

/**
 * Common logic to check permissions for a matter (already fetched)
 */
// biome-ignore lint/suspicious/noExplicitAny: generic matter type
async function checkMatterPermissions(
	tx: MutatorTx,
	ctx: Context,
	matter: any,
) {
	if (!matter) {
		throw new Error(PERMISSION_ERRORS.MATTER_NOT_FOUND);
	}

	const membership = await getTeamMembership(tx, ctx, matter.teamId);
	if (!membership) {
		throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);
	}

	const isAuthor = matter.authorId === ctx.userId;
	const isAssignee = matter.assigneeId === ctx.userId;
	const isManager = membership.role === "manager";

	return {
		matter,
		membership,
		canModify: isAuthor || isAssignee || isManager,
		isAuthor,
		isAssignee,
		isManager,
	};
}

/**
 * Check if user can modify a matter (author, assignee, or manager)
 */
export async function canModifyMatter(
	tx: MutatorTx,
	ctx: Context,
	matterId: string,
) {
	assertLoggedIn(ctx);

	const matter = await tx.run(
		zql.mattersTable
			.where("id", matterId)
			.where("orgId", ctx.activeOrganizationId)
			.where("deletedAt", "IS", null)
			.one(),
	);

	return checkMatterPermissions(tx, ctx, matter);
}
// Check if user can modify a deleted matter, needed for restore operations
export async function canModifyDeletedMatter(
	tx: MutatorTx,
	ctx: Context,
	matterId: string,
) {
	assertLoggedIn(ctx);

	const matter = await tx.run(
		zql.mattersTable
			.where("id", matterId)
			.where("orgId", ctx.activeOrganizationId)
			.where("deletedAt", "IS NOT", null)
			.one(),
	);

	return checkMatterPermissions(tx, ctx, matter);
}

/**
 * Assert user can modify a matter
 */
export async function assertCanModifyMatter(
	tx: MutatorTx,
	ctx: Context,
	matterId: string,
) {
	const result = await canModifyMatter(tx, ctx, matterId);
	if (!result.canModify) {
		throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
	}
	return result;
}

// ============================================================================
// PERMISSION HELPER FACTORY
// ============================================================================

/**
 * Create a permission helper instance for a specific transaction and context.
 * This reduces the need to pass tx and ctx to every permission function.
 */
export function createPermissionHelpers(tx: MutatorTx, ctx: Context) {
	return {
		// Core assertions
		assertLoggedIn: () => assertLoggedIn(ctx),

		// Team permissions
		getTeamMembership: (teamId: string) => getTeamMembership(tx, ctx, teamId),
		assertTeamMember: (teamId: string) => assertTeamMember(tx, ctx, teamId),
		assertTeamManager: (teamId: string) => assertTeamManager(tx, ctx, teamId),

		// Matter permissions
		canModifyMatter: (matterId: string) => canModifyMatter(tx, ctx, matterId),
		assertCanModifyMatter: (matterId: string) =>
			assertCanModifyMatter(tx, ctx, matterId),
		canModifyDeletedMatter: (matterId: string) =>
			canModifyDeletedMatter(tx, ctx, matterId),

		// Convenience methods
		assertMatterAuthor: async (matterId: string) => {
			const result = await assertCanModifyMatter(tx, ctx, matterId);
			if (!result.isAuthor) {
				throw new Error(PERMISSION_ERRORS.AUTHOR_REQUIRED);
			}
			return result;
		},

		assertMatterAssignee: async (matterId: string) => {
			const result = await assertCanModifyMatter(tx, ctx, matterId);
			if (!result.isAssignee) {
				throw new Error(PERMISSION_ERRORS.ASSIGNEE_REQUIRED);
			}
			return result;
		},
	};
}
