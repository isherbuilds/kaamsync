import { useEffect, useRef } from "react";
import { preloadAdjacentWorkspaces, preloadWorkspace } from "zero/preload";
import type { QueryContext } from "zero/queries";
import { useZ } from "./use-zero-cache";

/**
 * Hook to automatically preload workspace data when navigating.
 *
 * Based on zbugs pattern - preloads the current workspace and
 * optionally adjacent workspaces for instant navigation.
 *
 * @param ctx - Query context with user ID and active organization
 * @param currentWorkspaceId - ID of the currently viewed workspace
 * @param allWorkspaceIds - Optional array of all workspace IDs for adjacent preloading
 *
 * @example
 * ```tsx
 * function WorkspacePage() {
 *   const ctx = useQueryContext();
 *   const workspaces = useWorkspaces();
 *   const currentWorkspaceId = useCurrentWorkspaceId();
 *
 *   // Preloads current workspace + neighbors
 *   useWorkspacePreload(
 *     ctx,
 *     currentWorkspaceId,
 *     workspaces.map(w => w.id)
 *   );
 * }
 * ```
 */
export function useWorkspacePreload(
	ctx: QueryContext | null,
	currentWorkspaceId: string | null | undefined,
	allWorkspaceIds?: string[],
) {
	const z = useZ();
	const lastPreloadedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!ctx?.sub || !ctx?.activeOrganizationId || !currentWorkspaceId) {
			return;
		}

		// Only preload if workspace changed
		if (lastPreloadedRef.current === currentWorkspaceId) {
			return;
		}
		lastPreloadedRef.current = currentWorkspaceId;

		// Preload current workspace
		preloadWorkspace(z, ctx, currentWorkspaceId);

		// Preload adjacent workspaces if provided
		if (allWorkspaceIds && allWorkspaceIds.length > 1) {
			const currentIndex = allWorkspaceIds.indexOf(currentWorkspaceId);
			if (currentIndex !== -1) {
				// Get prev/next workspaces
				const adjacentIds: string[] = [];
				if (currentIndex > 0) {
					adjacentIds.push(allWorkspaceIds[currentIndex - 1]);
				}
				if (currentIndex < allWorkspaceIds.length - 1) {
					adjacentIds.push(allWorkspaceIds[currentIndex + 1]);
				}
				// Also preload first workspace if not already included
				if (!adjacentIds.includes(allWorkspaceIds[0]) && currentIndex !== 0) {
					adjacentIds.push(allWorkspaceIds[0]);
				}

				preloadAdjacentWorkspaces(z, ctx, adjacentIds, 3);
			}
		}
	}, [z, ctx, currentWorkspaceId, allWorkspaceIds]);
}

/**
 * Hook to preload a specific workspace on hover/focus.
 *
 * @returns A function to trigger preload for a workspace ID
 *
 * @example
 * ```tsx
 * function WorkspaceLink({ workspace }) {
 *   const preload = useWorkspaceHoverPreload(ctx);
 *
 *   return (
 *     <Link
 *       to={`/workspace/${workspace.id}`}
 *       onMouseEnter={() => preload(workspace.id)}
 *     >
 *       {workspace.name}
 *     </Link>
 *   );
 * }
 * ```
 */
export function useWorkspaceHoverPreload(ctx: QueryContext | null) {
	const z = useZ();
	const preloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	return (workspaceId: string) => {
		if (!ctx?.sub || !ctx?.activeOrganizationId || !workspaceId) {
			return;
		}

		// Debounce to avoid preloading on quick mouse movements
		if (preloadTimeoutRef.current) {
			clearTimeout(preloadTimeoutRef.current);
		}

		preloadTimeoutRef.current = setTimeout(() => {
			preloadWorkspace(z, ctx, workspaceId);
		}, 50); // Reduced from 150ms for quicker preload
	};
}
