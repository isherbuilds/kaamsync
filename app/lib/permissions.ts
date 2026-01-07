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
		role === teamRole.viewer
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
	return (
		role === teamRole.manager ||
		(role === teamRole.member && (isAuthor === true || isAssignee === true))
	);
}

/**
 * Check if role can delete matters
 */
export function canDeleteMatter(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

// ============================================================================
// ORGANIZATION ROLES & PERMISSIONS
// ============================================================================

/**
 * Organization-level roles (from Better Auth).
 * These control org-wide permissions like creating teams.
 */
export type OrgRole = "owner" | "admin" | "member";

/**
 * Check if org role can create teams
 */
export function canCreateTeams(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can invite members
 */
export function canInviteMembers(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can change org settings
 */
export function canChangeOrgSettings(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can delete org
 */
export function canDeleteOrg(role?: OrgRole | null): boolean {
	return role === "owner";
}

/**
 * Check if org role can manage billing (subscriptions, checkout, portal)
 * Only owner and admin can manage billing according to Better Auth best practices
 */
export function canManageBilling(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can view billing (read-only access to subscription status)
 * All members can view billing status
 */
export function canViewBilling(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin" || role === "member";
}
