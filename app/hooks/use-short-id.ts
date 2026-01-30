import { useZero } from "@rocicorp/zero/react";
import { useEffect, useRef } from "react";
import { zql } from "zero/schema";
import {
	getNextShortIdWithoutIncrement,
	initializeShortIdCache,
} from "~/lib/cache/short-id";
import { safeError } from "~/lib/utils/logger";

export function useTeamShortIdCache(teamId: string, enabled = true) {
	const z = useZero();
	const lastSeededTeamId = useRef<string | null>(null);

	useEffect(() => {
		if (!enabled) return;
		if (!teamId) {
			lastSeededTeamId.current = null;
			return;
		}
		if (lastSeededTeamId.current === teamId) return;
		if (typeof navigator !== "undefined" && !navigator.onLine) return;

		(async () => {
			try {
				const matters = await z.run(
					zql.mattersTable
						.where("teamId", "=", teamId)
						.where("deletedAt", "IS", null)
						.orderBy("shortID", "desc")
						.limit(1),
				);

				const proposed = (matters[0]?.shortID ?? 0) + 1;
				const current = getNextShortIdWithoutIncrement(teamId) ?? 0;

				if (proposed > current) {
					initializeShortIdCache(teamId, proposed);
				}

				lastSeededTeamId.current = teamId;
			} catch (err) {
				safeError(err, "Failed to seed short ID cache");
			}
		})();
	}, [enabled, teamId, z]);
}
