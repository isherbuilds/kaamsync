import { useZero } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { zql } from "zero/schema";
import { peekNextShortId, seedNextShortId } from "~/lib/infra/short-id-cache";

/**
 * Hook to seed the short ID cache for a team.
 * Uses the server's next_short_id counter directly with block allocation for optimal performance.
 */
export function useShortIdSeeder(
	teamId: string,
	enabled = true,
	blockSize = 10,
) {
	const z = useZero();
	const seededTeam = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;

		if (!teamId) {
			seededTeam.current = null;
			return;
		}

		if (seededTeam.current === teamId) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		const abortController = new AbortController();
		const signal = abortController.signal;

		(async () => {
			try {
				const [team] = await z.run(
					zql.teamsTable.where("id", "=", teamId).limit(1),
				);

				if (!team) return;

				const proposed = (team.nextShortId ?? 0) + 1;
				const current = peekNextShortId(teamId) ?? 0;

				if (proposed > current) {
					seedNextShortId(teamId, proposed, blockSize);
				}

				seededTeam.current = teamId;
			} catch (err) {
				if (!signal.aborted) {
					console.error("Failed to seed short ID cache:", err);
				}
			}
		})();

		return () => {
			abortController.abort();
		};
	}, [enabled, teamId, blockSize, z]);
}
