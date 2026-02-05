/**
 * Unified permission system for KaamSync.
 * Single source of truth for all permission logic used by both client and server.
 */

import { type TeamRole, teamRole } from "~/db/helpers";

// ============================================================================
// PERMISSION ERROR MESSAGES
// ============================================================================

export const PERMISSION_ERRORS = {
	NOT_LOGGED_IN: "User must be logged in",
	NOT_ORG_MEMBER: "Not a member of this organization",
	NOT_TEAM_MEMBER: "Not a member of this team",
	NO_APPROPRIATE_ROLE: "User does not have the appropriate role",
	MANAGER_REQUIRED: "Only team managers can perform this action",
	CANNOT_MODIFY_MATTER: "Cannot modify this matter",
	MATTER_NOT_FOUND: "Matter not found",
	TEAM_NOT_FOUND: "Team not found",
	ORGANIZATION_ACCESS_DENIED: "Access denied to this organization",
	AUTHOR_REQUIRED: "Only the matter author can perform this action",
	ASSIGNEE_REQUIRED: "Only the matter assignee can perform this action",
	ATTACHMENT_NOT_FOUND: "Attachment not found",
	ATTACHMENT_DELETE_DENIED:
		"You do not have permission to delete this attachment",
} as const;

// ============================================================================
// TEAM ROLE TYPES
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

// ============================================================================
// TEAM PERMISSION COMPUTATION
// ============================================================================

/**
 * Get default permissions for a team role.
 * This is the canonical source of truth for role permissions.
 */
export function getTeamRolePermissions(role: string): TeamRolePermissions {
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
 */
export type TeamPermissions = {
	teamId: string;
	role: TeamRole;
} & TeamRolePermissions;

/**
 * Build permissions from team role.
 */
export function buildTeamPermissions(
	teamId: string,
	role: TeamRole,
): TeamPermissions {
	const perms = getTeamRolePermissions(role);

	return {
		teamId,
		role,
		...perms,
	};
}

// ============================================================================
// TEAM PERMISSION CHECKS
// ============================================================================

/**
 * Check if role can approve requests
 */
export function hasRequestApprovalPermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can create tasks directly (without approval)
 */
export function hasTaskCreationPermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can create requests (needs approval)
 */
export function hasRequestCreationPermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager || role === teamRole.member;
}

/**
 * Check if role can manage team members
 */
export function hasMemberManagementPermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can manage team settings
 */
export function hasTeamManagementPermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if role can view team
 */
export function hasTeamViewPermission(role?: TeamRole | null): boolean {
	return (
		role === teamRole.manager ||
		role === teamRole.member ||
		role === teamRole.viewer
	);
}

/**
 * Check if role can edit matters
 */
export function hasMatterEditPermission(
	role?: TeamRole | null,
	isAuthor?: boolean,
	isAssignee?: boolean,
): boolean {
	return (
		role === teamRole.manager ||
		(role === teamRole.member && (isAuthor === true || isAssignee === true))
	);
}

/**
 * Check if role can delete matters
 */
export function hasMatterDeletePermission(role?: TeamRole | null): boolean {
	return role === teamRole.manager;
}

/**
 * Check if user can modify/delete an attachment.
 * Uploader can always modify their own uploads.
 * Otherwise uses same logic as hasMatterEditPermission (author, assignee, or manager).
 */
export function hasAttachmentModifyPermission(
	role?: TeamRole | null,
	isUploader?: boolean,
	isAuthor?: boolean,
	isAssignee?: boolean,
): boolean {
	if (isUploader === true) return true;
	return hasMatterEditPermission(role, isAuthor, isAssignee);
}

// ============================================================================
// ORGANIZATION PERMISSION CHECKS
// ============================================================================

/**
 * Organization-level roles (from Better Auth).
 */
export type OrgRole = "owner" | "admin" | "member";

/**
 * Check if org role can create teams
 */
export function hasTeamCreationPermission(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can invite members
 */
export function hasMemberInvitePermission(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can change org settings
 */
export function hasOrgSettingsPermission(role?: OrgRole | null): boolean {
	return role === "owner" || role === "admin";
}

/**
 * Check if org role can delete org
 */
export function hasOrgDeletePermission(role?: OrgRole | null): boolean {
	return role === "owner";
}

/**
 * Check if org role can manage billing (owner-only)
 */
export function hasBillingManagePermission(role?: OrgRole | null): boolean {
	return role === "owner";
}

/**
 * Check if org role can view billing (owner-only)
 */
export function hasBillingViewPermission(role?: OrgRole | null): boolean {
	return role === "owner";
}
