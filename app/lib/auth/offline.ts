import { ClientCache, fetchWithSWR, type SWROptions } from "~/lib/cache/client";
import type { AuthSession } from "./client";

const CACHE_KEY = "KaamSync:auth-session";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days to match cookie cache

const authCache = new ClientCache<AuthSession | null>(
	CACHE_KEY,
	CACHE_DURATION_MS,
);

export const isOffline = () =>
	typeof navigator !== "undefined" && navigator.onLine === false;

export function saveAuthSession(session: AuthSession | null) {
	if (session === null) {
		authCache.remove("current");
	} else {
		authCache.set("current", session);
	}
}

export function getAuthSession(): AuthSession | null {
	return authCache.get("current");
}

export function clearAuthSession() {
	authCache.remove("current");
}

// Aliases for backwards compatibility
export const saveAuthSessionToLocalStorage = saveAuthSession;
export const getAuthSessionFromLocalStorage = getAuthSession;
export const clearAuthSessionFromLocalStorage = clearAuthSession;

export async function getAuthSessionSWR(
	getSessionFn: () => Promise<{ data: AuthSession | null }>,
	options: Omit<SWROptions, "blockOnEmpty"> = {},
): Promise<AuthSession | null> {
	return fetchWithSWR(
		authCache,
		"current",
		async () => {
			const res = await getSessionFn();
			return res.data;
		},
		{ ...options, blockOnEmpty: !isOffline() },
	);
}
