import { ClientCache, fetchWithSWR, type SWROptions } from "~/lib/cache/client";
import type { AuthSession } from "./client";

const CACHE_KEY = "KaamSync:auth-session";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const authCache = new ClientCache<AuthSession>(CACHE_KEY, CACHE_DURATION_MS);

export function saveAuthSessionToLocalStorage(session: AuthSession | null) {
	authCache.set("current", session);
}

export function getAuthSessionFromLocalStorage(): AuthSession | null {
	return authCache.get("current");
}

export function clearAuthSessionFromLocalStorage() {
	authCache.remove("current");
}

export async function getAuthSessionSWR(
	getSessionFn: () => Promise<{ data: AuthSession | null }>,
	options: SWROptions = {},
): Promise<AuthSession | null> {
	return fetchWithSWR(
		authCache,
		"current",
		async () => {
			const res = await getSessionFn();
			return res.data ?? (null as unknown as AuthSession);
		},
		options,
	);
}
