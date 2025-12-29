import type { Row } from "@rocicorp/zero";
import { useMemo } from "react";
import {
	canApproveRequests as canApprove,
	canDeleteMatter as canDel,
	canEditMatter as canEdit,
	canManageMembers as canMem,
	canCreateRequests as canReq,
	canCreateTasks as canTask,
	canManageWorkspace as canWs,
	type WorkspaceRole,
} from "~/lib/permissions";
import { useOrgLoaderData } from "./use-loader-data";

/**
 * Unified hook for accessing organization and workspace permissions.
 * Optimized for performance by memoizing computed flags.
 */
export function usePermissions(
	workspaceId?: string,
	workspaceMemberships?: readonly Row["workspaceMembershipsTable"][],
) {
	const { authSession } = useOrgLoaderData();
	const userId = authSession.user.id;

	// Find membership for current workspace
	const membership = useMemo(() => {
		if (!workspaceId || !workspaceMemberships) return null;
		return workspaceMemberships.find(
			(m) =>
				m.workspaceId === workspaceId && m.userId === userId && !m.deletedAt,
		);
	}, [workspaceId, workspaceMemberships, userId]);

	const role = membership?.role as WorkspaceRole | undefined;

	// Compute all permission flags once
	return useMemo(
		() => ({
			role,
			// Workspace permissions
			canCreateTasks: canTask(role),
			canCreateRequests: canReq(role),
			canApproveRequests: canApprove(role),
			canManageMembers: canMem(role),
			canManageWorkspace: canWs(role),

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
