import { Zero } from "@rocicorp/zero";
import { ZeroProvider } from "@rocicorp/zero/react";
import { useCallback, useMemo, useState } from "react";
import { must } from "shared/must";
import { mutators } from "zero/mutators";
import { preloadAll } from "zero/preload";
import { schema } from "zero/schema";
import { authClient } from "~/lib/auth-client";
import { getAuthSessionFromLocalStorage } from "~/lib/offline-auth";

const cacheURL = must(
	import.meta.env.VITE_PUBLIC_ZERO_CACHE_URL,
	"VITE_PUBLIC_ZERO_CACHE_URL is required",
);

export function ZeroInit({ children }: { children: React.ReactNode }) {
	const { data: authSession } = authClient.useSession();
	const [storedSession] = useState(() =>
		typeof window !== "undefined" ? getAuthSessionFromLocalStorage() : null,
	);

	// Use network session, fallback to cached for offline
	const session = authSession ?? storedSession;
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

	const z = useMemo(() => {
		return new Zero({
			userID,
			context: { userId: userID, activeOrganizationId },
			cacheURL,
			schema,
			mutators,
			storageKey,
			kvStore: "idb", // kvStore is now top-level
		});
	}, [userID, activeOrganizationId, storageKey]);

	return (
		<ZeroProvider zero={z} init={init}>
			{children}
		</ZeroProvider>
	);
}
