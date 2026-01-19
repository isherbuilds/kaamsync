import { useZero } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { zql } from "zero/schema";
import { peekNextShortId, seedNextShortId } from "~/lib/cache/short-id";

/**
 * Hook to seed the short ID cache for a team.
 * Allocates a block from the server if needed and seeds the local cache.
 */
export function useShortIdSeeder(teamId: string, enabled = true) {
	const z = useZero();
	// Remember the last team we seeded so we can re-seed when it changes
	const seededTeam = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;

		// If there's no team selected, clear the seeded marker and exit
		if (!teamId) {
			seededTeam.current = null;
			return;
		}

		// Already seeded for this team — skip
		if (seededTeam.current === teamId) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		(async () => {
			try {
				// Seed cache from latest local matter in THIS team to ensure continuity
				const matters = await z.run(
					zql.mattersTable
						.where("teamId", "=", teamId)
						.where("deletedAt", "IS", null)
						.orderBy("shortID", "desc")
						.limit(1),
				);

				// Fetched highest shortID (efficient due to index)
				const proposed = (matters[0]?.shortID ?? 0) + 1;
				const current = peekNextShortId(teamId) ?? 0;

				if (proposed > current) {
					seedNextShortId(teamId, proposed);
				}

				// Mark this team as seeded
				seededTeam.current = teamId;
			} catch (err) {
				console.error("Failed to seed short ID cache:", err);
			}
		})();
	}, [enabled, teamId, z]);
}
