/**
 * @file Client-side short ID cache for offline sequence generation
 * @description Provides optimistic short ID generation for team-specific sequences
 * using browser localStorage. Server remains authoritative; client cache is best-effort
 * and automatically clears on version mismatch.
 *
 * Key exports:
 * - initializeShortIdCache(teamId, next) - Initialize cache with server value
 * - getNextShortIdWithoutIncrement(teamId) - Get next ID without incrementing
 * - consumeNextShortId(teamId) - Get current and increment for next
 * - clearTeamShortIdCache(teamId) - Clear cache for specific team
 *
 * @example
 * // On load, seed with server value
 * initializeShortIdCache(teamId, serverNextId);
 * // Generate offline ID
 * const localId = consumeNextShortId(teamId);
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CACHE_KEY_PREFIX = "bt:nextShortId:";
const CACHE_VERSION_KEY = "bt:shortIdCache:version";
const CACHE_VERSION = "1";
const MAX_CACHED_TEAMS = 100;

// =============================================================================
// INTERNAL UTILITIES
// =============================================================================

function buildCacheKey(teamId: string) {
	return `${CACHE_KEY_PREFIX}${teamId}`;
}

function parsePositiveInt(value: string | null): number | undefined {
	if (!value) return undefined;
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

function validateCacheVersion() {
	if (typeof localStorage === "undefined") return;
	const version = localStorage.getItem(CACHE_VERSION_KEY);
	if (version !== CACHE_VERSION) {
		clearAllTeamCaches();
		localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
	}
}

function clearAllTeamCaches() {
	if (typeof localStorage === "undefined") return;
	const keys = Object.keys(localStorage).filter((k) =>
		k.startsWith(CACHE_KEY_PREFIX),
	);
	for (const key of keys) {
		localStorage.removeItem(key);
	}
}

function pruneExcessTeamCaches() {
	if (typeof localStorage === "undefined") return;
	const teams = listCachedTeamIds();
	if (teams.length > MAX_CACHED_TEAMS) {
		const toRemove = teams.slice(0, teams.length - MAX_CACHED_TEAMS);
		for (const teamId of toRemove) {
			clearTeamShortIdCache(teamId);
		}
	}
}

// =============================================================================
// PUBLIC API
// =============================================================================

export function initializeShortIdCache(teamId: string, next: number) {
	if (typeof localStorage === "undefined") return;
	validateCacheVersion();
	if (!Number.isFinite(next) || next < 1) return;
	const key = buildCacheKey(teamId);
	const current = parsePositiveInt(localStorage.getItem(key));
	if (!current || current < next) {
		localStorage.setItem(key, String(next));
		pruneExcessTeamCaches();
	}
}

export function getNextShortIdWithoutIncrement(
	teamId: string,
): number | undefined {
	if (typeof localStorage === "undefined") return undefined;
	validateCacheVersion();
	const key = buildCacheKey(teamId);
	return parsePositiveInt(localStorage.getItem(key));
}

export function consumeNextShortId(teamId: string): number {
	if (typeof localStorage === "undefined") return 0;
	validateCacheVersion();
	const key = buildCacheKey(teamId);
	const current = parsePositiveInt(localStorage.getItem(key)) ?? 1;
	localStorage.setItem(key, String(current + 1));
	pruneExcessTeamCaches();
	return current;
}

export function clearTeamShortIdCache(teamId: string) {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(buildCacheKey(teamId));
}

export function listCachedTeamIds(): string[] {
	if (typeof localStorage === "undefined") return [];
	const keys = Object.keys(localStorage).filter((k) =>
		k.startsWith(CACHE_KEY_PREFIX),
	);
	return keys.map((k) => k.replace(CACHE_KEY_PREFIX, ""));
}
