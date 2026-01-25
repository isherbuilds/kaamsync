import type { Zero, ZeroOptions } from "@rocicorp/zero";
import { ZeroProvider } from "@rocicorp/zero/react";
import { useCallback, useMemo, useState } from "react";
import { mutators } from "zero/mutators";
import { preloadAll } from "zero/preload";
import { schema } from "zero/schema";
import type { AuthSession } from "~/lib/auth/client";
import { getAuthSessionFromLocalStorage } from "~/lib/auth/offline";
import { must } from "~/lib/utils/must";

const cacheURL = must(
	import.meta.env.VITE_PUBLIC_ZERO_CACHE_URL,
	"VITE_PUBLIC_ZERO_CACHE_URL is required",
);

export function ZeroInit({
	children,
	authSession,
}: {
	children: React.ReactNode;
	authSession?: AuthSession | null;
}) {
	// Use passed session, fallback to cached for offline
	const session = authSession ?? getAuthSessionFromLocalStorage();
	const userID = session?.user.id ?? "anon";
	const activeOrganizationId = session?.session.activeOrganizationId ?? null;

	// Per-org IndexedDB key for data isolation
	const storageKey = !activeOrganizationId
		? `user:${userID}`
		: `user:${userID}:org:${activeOrganizationId}`;

	const init = useCallback(() => {
		if (userID === "anon" || !activeOrganizationId) return undefined;
		return (z: Zero) => {
			preloadAll(z);
		};
	}, [userID, activeOrganizationId]);

	const options: ZeroOptions = useMemo(
		() => ({
			schema,
			userID,
			storageKey,
			context: {
				userId: userID,
				activeOrganizationId,
			},
			cacheURL,
			mutators,
			kvStore: "idb",
			init,
		}),
		[userID, activeOrganizationId, init, storageKey],
	);

	return <ZeroProvider {...options}>{children}</ZeroProvider>;
}
