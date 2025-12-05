import { useEffect, useRef } from "react";
import { useZ } from "~/hooks/use-zero-cache";
import { peekNextShortId, seedNextShortId } from "~/lib/short-id-cache";

/**
 * Hook to seed the short ID cache for a workspace.
 * Allocates a block from the server if needed and seeds the local cache.
 */
export function useShortIdSeeder(workspaceId: string, enabled = true) {
	const z = useZ();
	const seeded = useRef(false);

	useEffect(() => {
		if (!enabled || seeded.current) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		(async () => {
			try {
				// Seed cache from latest local matter to ensure continuity
				const matters = await z.query.mattersTable
					.where("workspaceId", workspaceId)
					.where("deletedAt", "IS", null)
					.orderBy("shortID", "desc")
					.limit(1)
					.run();

				const proposed = (matters[0]?.shortID ?? 0) + 1;
				const current = peekNextShortId(workspaceId) ?? 0;

				if (proposed > current) {
					seedNextShortId(workspaceId, proposed);
				}

				seeded.current = true;
			} catch (err) {
				console.error("Failed to seed short ID cache:", err);
			}
		})();
	}, [enabled, workspaceId, z]);
}
