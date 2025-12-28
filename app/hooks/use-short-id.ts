import { useZero } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { zql } from "zero/schema";
import { peekNextShortId, seedNextShortId } from "~/lib/short-id-cache";

/**
 * Hook to seed the short ID cache for a workspace.
 * Allocates a block from the server if needed and seeds the local cache.
 */
export function useShortIdSeeder(workspaceId: string, enabled = true) {
	const z = useZero();
	// Remember the last workspace we seeded so we can re-seed when it changes
	const seededWorkspace = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;

		// If there's no workspace selected, clear the seeded marker and exit
		if (!workspaceId) {
			seededWorkspace.current = null;
			return;
		}

		// Already seeded for this workspace — skip
		if (seededWorkspace.current === workspaceId) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		(async () => {
			try {
				// Seed cache from latest local matter in THIS workspace to ensure continuity
				const matters = await z.run(
					zql.mattersTable
						.where("workspaceId", "=", workspaceId)
						.where("deletedAt", "IS", null)
						.orderBy("shortID", "desc")
						.limit(1),
				);

				// Fetched highest shortID (efficient due to index)
				const proposed = (matters[0]?.shortID ?? 0) + 1;
				const current = peekNextShortId(workspaceId) ?? 0;

				if (proposed > current) {
					seedNextShortId(workspaceId, proposed);
				}

				// Mark this workspace as seeded
				seededWorkspace.current = workspaceId;
			} catch (err) {
				console.error("Failed to seed short ID cache:", err);
			}
		})();
	}, [enabled, workspaceId, z]);
}
