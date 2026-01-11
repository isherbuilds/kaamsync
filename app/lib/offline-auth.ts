import type { AuthSession } from "./auth-client";

const CACHE_KEY = "KaamSync:auth-session";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

type CachedSession = { session: AuthSession; timestamp: number };

// In-memory cache for instant reads
let memCache: CachedSession | null = null;

function isExpired(timestamp: number): boolean {
	return Date.now() - timestamp > CACHE_DURATION_MS;
}

function loadFromStorage(): CachedSession | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return null;
		const cached = JSON.parse(raw) as CachedSession;
		return isExpired(cached.timestamp) ? null : cached;
	} catch (e) {
		console.warn("Retrieved invalid auth session from storage", e);
		return null;
	}
}

function saveToStorage(cached: CachedSession | null) {
	if (typeof window === "undefined") return;
	try {
		if (cached) {
			localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
		} else {
			localStorage.removeItem(CACHE_KEY);
		}
	} catch (err) {
		console.warn("Failed to persist auth session:", err);
	}
}

export function saveAuthSessionToLocalStorage(session: AuthSession | null) {
	if (!session) {
		memCache = null;
		saveToStorage(null);
		return;
	}
	memCache = { session, timestamp: Date.now() };
	saveToStorage(memCache);
}

export function getAuthSessionFromLocalStorage(): AuthSession | null {
	// Fast path: return from memory if valid
	if (memCache && !isExpired(memCache.timestamp)) {
		return memCache.session;
	}
	// Slow path: load from localStorage and populate memory
	memCache = loadFromStorage();
	return memCache?.session ?? null;
}

export function clearAuthSessionFromLocalStorage() {
	memCache = null;
	saveToStorage(null);
}

/**
 * Smart cached session retrieval with optional SWR (stale‑while‑revalidate) and a
 * forceNetwork mode to synchronously refresh and update cache (used when org changes).
 */
export async function getAuthSessionSWR(
	getSessionFn: () => Promise<{ data: AuthSession | null }>,
	options: {
		refreshMaxAgeMs?: number;
		blockOnEmpty?: boolean;
		forceNetwork?: boolean; // bypass cache & await network; falls back to cache if request fails
	} = {},
): Promise<AuthSession | null> {
	const {
		refreshMaxAgeMs = 60_000,
		blockOnEmpty = true,
		forceNetwork = false,
	} = options;

	// If we are forcing a network refresh, try it first and update cache, fallback to cached.
	if (forceNetwork) {
		try {
			const result = await getSessionFn();
			const session = result.data ?? null;
			saveAuthSessionToLocalStorage(session);
			return session;
		} catch {
			// fallback to existing cached session (may be null)
			const cached = getAuthSessionFromLocalStorage();
			return cached;
		}
	}

	// Try to get cached session
	const cached = getAuthSessionFromLocalStorage();

	// If we have a cached session, return it immediately
	if (cached) {
		// Background refresh if stale and online
		const isStale =
			memCache && Date.now() - memCache.timestamp > refreshMaxAgeMs;
		if (isStale && typeof navigator !== "undefined" && navigator.onLine) {
			void getSessionFn()
				.then((res) => saveAuthSessionToLocalStorage(res?.data ?? null))
				.catch(() => {
					// Ignore background refresh errors
				});
		}
		return cached;
	}

	// No cache: fetch if blockOnEmpty is true
	if (!blockOnEmpty) return null;

	try {
		const result = await getSessionFn();
		const session = result.data ?? null;
		saveAuthSessionToLocalStorage(session);
		return session;
	} catch (e) {
		console.warn("Failed to fetch session (blocking)", e);
		return null;
	}
}
