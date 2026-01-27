import { useZero } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { zql } from "zero/schema";
import {
	getNextShortIdWithoutIncrement,
	initializeShortIdCache,
} from "~/lib/cache/short-id";

/**
 * Seeds and manages the short ID cache for a specific team.
 *
 * This hook ensures the local short ID cache is initialized with a value
 * higher than the highest existing shortID in the team's matters. This
 * prevents duplicate short IDs when creating new matters.
 *
 * The cache is re-seeded when the team changes.
 *
 * @param teamId - The team ID to seed the cache for
 * @param enabled - Whether seeding is enabled (e.g., only when dialog is open)
 */
export function useTeamShortIdCache(teamId: string, enabled = true) {
	const z = useZero();

	// Track the last team we seeded to avoid redundant seeding
	const lastSeededTeamId = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;

		// If there's no team selected, clear the seeded marker and exit
		if (!teamId) {
			lastSeededTeamId.current = null;
			return;
		}

		// Already seeded for this team — skip
		if (lastSeededTeamId.current === teamId) return;
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
				const current = getNextShortIdWithoutIncrement(teamId) ?? 0;

				if (proposed > current) {
					initializeShortIdCache(teamId, proposed);
				}

				// Mark this team as seeded
				lastSeededTeamId.current = teamId;
			} catch (err) {
				console.error("Failed to seed short ID cache:", err);
			}
		})();
	}, [enabled, teamId, z]);
}
