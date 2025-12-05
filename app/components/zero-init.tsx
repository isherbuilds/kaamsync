import type { Zero } from "@rocicorp/zero";
import { ZeroProvider } from "@rocicorp/zero/react";
import { useMemo } from "react";
import { must } from "shared/must";
import { createMutators, type Mutators } from "zero/mutators";
import { preloadAll } from "zero/preload";
import { type Schema, schema } from "zero/schema";
import { authClient } from "~/lib/auth-client";
import { getAuthSessionFromLocalStorage } from "~/lib/offline-auth";

const serverURL = must(
	import.meta.env.VITE_PUBLIC_SERVER,
	"VITE_PUBLIC_SERVER is required",
);

export function ZeroInit({ children }: { children: React.ReactNode }) {
	const { data: authSession } = authClient.useSession();

	// Use network session, fallback to cached for offline
	const session =
		authSession ??
		(typeof window !== "undefined" ? getAuthSessionFromLocalStorage() : null);
	const userID = session?.user.id ?? "anon";
	const activeOrganizationId = session?.session.activeOrganizationId ?? null;

	// Per-org IndexedDB key for data isolation
	const storageKey = !activeOrganizationId
		? `user:${userID}`
		: `user:${userID}:org:${activeOrganizationId}`;

	const mutators = useMemo(
		() => createMutators({ sub: userID, activeOrganizationId }),
		[userID, activeOrganizationId],
	);

	// Following zbugs pattern: init callback for preloading
	const init = useMemo(() => {
		if (userID === "anon" || !activeOrganizationId) return undefined;
		return (z: Zero<Schema, Mutators>) => {
			preloadAll(z, { sub: userID, activeOrganizationId });
		};
	}, [userID, activeOrganizationId]);

	// Key forces remount when org changes (fresh Zero instance per org)
	return (
		<ZeroProvider
			key={storageKey}
			schema={schema}
			userID={userID}
			storageKey={storageKey}
			server={serverURL}
			kvStore="idb"
			mutators={mutators}
			init={init}
		>
			{children}
		</ZeroProvider>
	);
}
