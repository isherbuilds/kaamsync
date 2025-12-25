/**
 * Unified permission system for KaamSync.
 * Consolidates workspace and organization permission logic into a single source of truth.
 * Keep simple and fast - just role checks, no complex logic.
 */

import { type WorkspaceRole, workspaceRole } from "~/db/helpers";

// ============================================================================
// WORKSPACE ROLES & PERMISSIONS
// ============================================================================

export type { WorkspaceRole };

/**
 * Workspace permission flags computed from role.
 */
export type WorkspaceRolePermissions = {
	canCreateTasks: boolean;
	canCreateRequests: boolean;
	canApproveRequests: boolean;
	canManageMembers: boolean;
	canManageWorkspace: boolean;
};

/**
 * Get default permissions for a workspace role.
 * Used to compute permission flags from role for membership records.
 */
export function getRolePermissions(role: string): WorkspaceRolePermissions {
	switch (role) {
		case workspaceRole.manager:
			return {
				canCreateTasks: true,
				canCreateRequests: true,
				canApproveRequests: true,
				canManageMembers: true,
				canManageWorkspace: true,
			};
		case workspaceRole.member:
			return {
				canCreateTasks: false,
				canCreateRequests: true,
				canApproveRequests: false,
				canManageMembers: false,
				canManageWorkspace: false,
			};
		case workspaceRole.viewer:
			return {
				canCreateTasks: false,
				canCreateRequests: false,
				canApproveRequests: false,
				canManageMembers: false,
				canManageWorkspace: false,
			};
		default:
			return {
				canCreateTasks: false,
				canCreateRequests: true,
				canApproveRequests: false,
				canManageMembers: false,
				canManageWorkspace: false,
			};
	}
}

/**
 * Workspace permission context loaded per-workspace.
 * Kept minimal and fast - just role + computed permissions.
 */
export type WorkspacePermissions = {
	workspaceId: string;
	role: WorkspaceRole;
} & WorkspaceRolePermissions;

/**
 * Compute permissions from workspace role.
 * Fast pure function, no DB calls.
 *
 * Why keep both role AND permission flags?
 * 1. Security: Can't be faked client-side (computed server-side)
 * 2. Performance: No extra DB query per permission check
 * 3. Flexibility: Can override defaults (temp elevated access)
 * 4. Clarity: Explicit what user can do in this workspace
 */
export function computeWorkspacePermissions(
	workspaceId: string,
	role: WorkspaceRole,
): WorkspacePermissions {
	const perms = getRolePermissions(role);

	return {
		workspaceId,
		role,
		...perms,
	};
}

// ============================================================================
// WORKSPACE PERMISSION CHECKS (role-based)
// ============================================================================

/**
 * Check if role can approve requests
 */
export function canApproveRequests(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager;
}

/**
 * Check if role can create tasks directly (without approval)
 */
export function canCreateTasks(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager;
}

/**
 * Check if role can create requests (needs approval)
 */
export function canCreateRequests(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager || role === workspaceRole.member;
}

/**
 * Check if role can manage workspace members
 */
export function canManageMembers(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager;
}

/**
 * Check if role can manage workspace settings
 */
export function canManageWorkspace(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager;
}

/**
 * Check if role can view workspace
 */
export function canViewWorkspace(role?: WorkspaceRole | null): boolean {
	return (
		role === workspaceRole.manager ||
		role === workspaceRole.member ||
		role === workspaceRole.viewer
	);
}

/**
 * Check if role can edit matters
 */
export function canEditMatter(
	role?: WorkspaceRole | null,
	isAuthor?: boolean,
	isAssignee?: boolean,
): boolean {
	// Managers can edit all, members can edit their own
	return (
		role === workspaceRole.manager ||
		(role === workspaceRole.member &&
			(isAuthor === true || isAssignee === true))
	);
}

/**
 * Check if role can delete matters
 */
export function canDeleteMatter(role?: WorkspaceRole | null): boolean {
	return role === workspaceRole.manager;
}

// ============================================================================
// ORGANIZATION ROLES & PERMISSIONS
// ============================================================================

/**
 * Organization-level roles (from Better Auth).
 * These control org-wide permissions like creating workspaces.
 */
export type OrgRole = "owner" | "admin" | "member";

/**
 * Check if org role can create workspaces
 */
export function canCreateWorkspaces(role?: OrgRole | null): boolean {
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
