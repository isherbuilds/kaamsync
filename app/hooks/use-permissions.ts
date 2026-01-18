import type { Row } from "@rocicorp/zero";
import { useMemo } from "react";
import {
	canApproveRequests,
	canCreateRequests,
	canCreateTasks,
	canDeleteMatter,
	canEditMatter,
	canManageMembers,
	canManageTeam,
	type TeamRole,
} from "~/lib/auth/permissions";
import { useOrgLoaderData } from "./use-loader-data";

export type UsePermissionsResult = {
	role: TeamRole | undefined;
	canCreateTasks: boolean;
	canCreateRequests: boolean;
	canApproveRequests: boolean;
	canManageMembers: boolean;
	canManageTeam: boolean;
	canEditMatter: (
		matterAuthorId: string,
		matterAssigneeId?: string | null,
	) => boolean;
	canDeleteMatter: () => boolean;
	isManager: boolean;
	isMember: boolean;
	isViewer: boolean;
};

/**
 * Unified hook for accessing organization and team permissions.
 * Optimized for performance by memoizing computed flags.
 */
export function usePermissions(
	teamId?: string,
	teamMemberships?: readonly Row["teamMembershipsTable"][],
): UsePermissionsResult {
	const { authSession } = useOrgLoaderData();
	const userId = authSession.user.id;

	// Find membership for current team
	const membership = useMemo(() => {
		if (!teamId || !teamMemberships) return null;
		return teamMemberships.find(
			(m) => m.teamId === teamId && m.userId === userId && !m.deletedAt,
		);
	}, [teamId, teamMemberships, userId]);

	const role = membership?.role as TeamRole | undefined;

	// Compute all permission flags once
	return useMemo(
		() => ({
			role,
			// Team permissions
			canCreateTasks: canCreateTasks(role),
			canCreateRequests: canCreateRequests(role),
			canApproveRequests: canApproveRequests(role),
			canManageMembers: canManageMembers(role),
			canManageTeam: canManageTeam(role),

			// Matter specific permissions (curried)
			canEditMatter: (
				matterAuthorId: string,
				matterAssigneeId?: string | null,
			) =>
				canEditMatter(
					role,
					matterAuthorId === userId,
					matterAssigneeId === userId,
				),

			canDeleteMatter: () => canDeleteMatter(role),

			// Helper to check for multiple roles easily
			isManager: role === "manager",
			isMember: role === "member",
			isViewer: role === "viewer",
		}),
		[role, userId],
	);
}
