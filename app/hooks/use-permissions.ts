import type { Row } from "@rocicorp/zero";
import { useMemo } from "react";
import {
	canApproveRequests as canApprove,
	canDeleteMatter as canDel,
	canEditMatter as canEdit,
	canManageMembers as canMem,
	canCreateRequests as canReq,
	canCreateTasks as canTask,
	canManageTeam as canWs,
	type TeamRole,
} from "~/lib/permissions";
import { useOrgLoaderData } from "./use-loader-data";

/**
 * Unified hook for accessing organization and team permissions.
 * Optimized for performance by memoizing computed flags.
 */
export function usePermissions(
	teamId?: string,
	teamMemberships?: readonly Row["teamMembershipsTable"][],
) {
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
			canCreateTasks: canTask(role),
			canCreateRequests: canReq(role),
			canApproveRequests: canApprove(role),
			canManageMembers: canMem(role),
			canManageTeam: canWs(role),

			// Matter specific permissions (curried)
			canEditMatter: (
				matterAuthorId: string,
				matterAssigneeId?: string | null,
			) =>
				canEdit(role, matterAuthorId === userId, matterAssigneeId === userId),

			canDeleteMatter: () => canDel(role),

			// Helper to check for multiple roles easily
			isManager: role === "manager",
			isMember: role === "member",
			isViewer: role === "viewer",
		}),
		[role, userId],
	);
}
