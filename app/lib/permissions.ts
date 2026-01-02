/**
 * Unified permission system for KaamSync.
 * Consolidates team and organization permission logic into a single source of truth.
 * Keep simple and fast - just role checks, no complex logic.
 */

import { type TeamRole, teamRole } from "~/db/helpers";

// ============================================================================
// TEAM ROLES & PERMISSIONS
// ============================================================================

export type { TeamRole };

/**
 * Team permission flags computed from role.
 */
export type TeamRolePermissions = {
	canCreateTasks: boolean;
	canCreateRequests: boolean;
	canApproveRequests: boolean;
	canManageMembers: boolean;
	canManageTeam: boolean;
};

/**
 * Get default permissions for a team role.
 * Used to compute permission flags from role for membership records.
 */
export function getRolePermissions(role: string): TeamRolePermissions {
	switch (role) {
		case teamRole.manager:
			return {
				canCreateTasks: true,
				canCreateRequests: true,
				canApproveRequests: true,
				canManageMembers: true,
				canManageTeam: true,
			};
		case teamRole.member:
			return {
				canCreateTasks: false,
				canCreateRequests: true,
				canApproveRequests: false,
				canManageMembers: false,
				canManageTeam: false,
			};
		case teamRole.viewer:
			return {
				canCreateTasks: false,
				canCreateRequests: false,
				canApproveRequests: false,
				canManageMembers: false,
				canManageTeam: false,
			};
		case teamRole.guest:
			return {
				canCreateTasks: false,
				canCreateRequests: false,
				canApproveRequests: false,
				canManageMembers: false,
				canManageTeam: false,
			};
		default:
			return {
				canCreateTasks: false,
				canCreateRequests: true,
				canApproveRequests: false,
				canManageMembers: false,
				canManageTeam: false,
			};
	}
}

/**
 * Team permission context loaded per-team.
 * Kept minimal and fast - just role + computed permissions.
 */
export type TeamPermissions = {
	teamId: string;
	role: TeamRole;
} & TeamRolePermissions;

/**
 * Compute permissions from team role.
 * Fast pure function, no DB calls.
 *
 * Why keep both role AND permission flags?
 * 1. Security: Can't be faked client-side (computed server-side)
 * 2. Performance: No extra DB query per permission check
 * 3. Flexibility: Can override defaults (temp elevated access)
 * 4. Clarity: Explicit what user can do in this team
 */
export function computeTeamPermissions(
	teamId: string,
	role: TeamRole,
): TeamPermissions {
	const perms = getRolePermissions(role);

	return {
		teamId,
		role,
		...perms,
	};
}

// ============================================================================
// TEAM PERMISSION CHECKS (role-based)
// ============================================================================

/**
 * Check if role can approve requests
 */
export function canApproveRequests(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can create tasks directly (without approval)
 */
export function canCreateTasks(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can create requests (needs approval)
 */
export function canCreateRequests(role?: TeamRole | null): boolean {
	return role === teamRole.manager || role === teamRole.member;
}

/**
 * Check if role can manage team members
 */
export function canManageMembers(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can manage team settings
 */
export function canManageTeam(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can view team
 */
export function canViewTeam(role?: TeamRole | null): boolean {
	return (
		role === teamRole.manager ||
		role === teamRole.member ||
		role === teamRole.viewer ||
		role === teamRole.guest
	);
}

/**
 * Check if role can edit matters
 */
export function canEditMatter(
	role?: TeamRole | null,
	isAuthor?: boolean,
	isAssignee?: boolean,
): boolean {
	// Managers can edit all, members can edit their own
	// Guests are external users who can only complete or comment on tasks assigned to them
	return (
		role === teamRole.manager ||
		((role === teamRole.member || role === teamRole.guest) &&
			(isAuthor === true || isAssignee === true))
	);
}

/**
 * Check if role can delete matters
 */
export function canDeleteMatter(role?: TeamRole | null): boolean {
	// Only managers can delete matters
	return role === teamRole.manager;
}

// ============================================================================
// ORGANIZATION ROLES & PERMISSIONS
// ============================================================================

/**
 * Organization-level roles (from Better Auth).
 * These control org-wide permissions like creating teams.
 *
 * Note: Org-level permission enforcement is handled by Better Auth's AC system.
 * Plan-based limits are enforced server-side in zero/plan-limits.ts
 */
export type OrgRole = "owner" | "admin" | "member" | "guest";
