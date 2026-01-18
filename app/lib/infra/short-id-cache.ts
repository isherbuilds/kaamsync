/**
 * @file Client-side short ID cache for offline sequence generation
 * @description Provides optimistic short ID generation for team-specific sequences
 * using browser localStorage. Server remains authoritative; client cache is best-effort
 * and automatically clears on version mismatch.
 *
 * Key exports:
 * - seedNextShortId(teamId, next, blockSize) - Initialize cache with server value
 * - peekNextShortId(teamId) - Get next ID without incrementing
 * - getAndIncrementNextShortId(teamId) - Get current and increment for next
 * - clearTeamCache(teamId) - Clear cache for specific team
 *
 * @example
 * // On load, seed with server value (block of 10)
 * seedNextShortId(teamId, serverNextId, 10);
 * // Generate offline ID
 * const localId = getAndIncrementNextShortId(teamId);
 */

// Simple per-team short ID cache using localStorage.
// Provides a best-effort offline sequence; server remains authoritative.

const KEY_PREFIX = "bt:nextShortId:";
const VERSION_KEY = "bt:shortIdCache:v2";
const CURRENT_VERSION = "2";
const MAX_TEAMS = 100;
const DEFAULT_BLOCK_SIZE = 10; // Prevent localStorage bloat

function getKey(teamId: string) {
	return `${KEY_PREFIX}${teamId}`;
}

function safeParseInt(value: string | null): number | undefined {
	if (!value) return undefined;
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Check cache version and clear if outdated
 */
function checkVersion() {
	if (typeof localStorage === "undefined") return;
	const version = localStorage.getItem(VERSION_KEY);
	if (version !== CURRENT_VERSION) {
		clearAllTeams();
		localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
	}
}

export function seedNextShortId(
	teamId: string,
	next: number,
	blockSize = DEFAULT_BLOCK_SIZE,
) {
	if (typeof localStorage === "undefined") return;
	checkVersion();
	if (!Number.isFinite(next) || next < 1) return;
	const key = getKey(teamId);
	const current = safeParseInt(localStorage.getItem(key));
	if (!current || current < next) {
		localStorage.setItem(key, String(next));
		localStorage.setItem(`${key}:block`, String(blockSize));
		enforceMaxTeams();
	}
}

export function peekNextShortId(teamId: string): number | undefined {
	if (typeof localStorage === "undefined") return undefined;
	checkVersion();
	const key = getKey(teamId);
	return safeParseInt(localStorage.getItem(key));
}

export function getRemainingInBlock(teamId: string): number {
	if (typeof localStorage === "undefined") return 0;
	const key = getKey(teamId);
	const current = safeParseInt(localStorage.getItem(key)) ?? 1;
	const blockSize =
		safeParseInt(localStorage.getItem(`${key}:block`)) ?? DEFAULT_BLOCK_SIZE;
	return Math.max(0, current + blockSize - current);
}

export function getAndIncrementNextShortId(teamId: string): number {
	if (typeof localStorage === "undefined") return 0;
	checkVersion();
	const key = getKey(teamId);
	const blockKey = `${key}:block`;
	const current = safeParseInt(localStorage.getItem(key)) ?? 1;
	const blockSize =
		safeParseInt(localStorage.getItem(blockKey)) ?? DEFAULT_BLOCK_SIZE;
	const nextValue = current + 1;

	if (nextValue >= current + blockSize) {
		localStorage.setItem(key, String(nextValue));
		localStorage.setItem(blockKey, String(blockSize));
		enforceMaxTeams();
	} else {
		localStorage.setItem(key, String(nextValue));
	}
	return current;
}

export function clearTeamCache(teamId: string) {
	if (typeof localStorage === "undefined") return;
	const key = getKey(teamId);
	localStorage.removeItem(key);
	localStorage.removeItem(`${key}:block`);
}

/**
 * Clear all team caches
 */
function clearAllTeams() {
	if (typeof localStorage === "undefined") return;
	const keys = Object.keys(localStorage).filter((k) =>
		k.startsWith(KEY_PREFIX),
	);
	for (const key of keys) {
		localStorage.removeItem(key);
	}
}

/**
 * Get all cached team IDs (for debugging)
 */
export function getAllCachedTeams(): string[] {
	if (typeof localStorage === "undefined") return [];
	const keys = Object.keys(localStorage).filter((k) =>
		k.startsWith(KEY_PREFIX),
	);
	return keys.map((k) => k.replace(KEY_PREFIX, ""));
}

/**
 * Enforce max team limit by removing oldest entries
 */
function enforceMaxTeams() {
	if (typeof localStorage === "undefined") return;
	const teams = getAllCachedTeams();
	if (teams.length > MAX_TEAMS) {
		// Remove oldest (first in list)
		const toRemove = teams.slice(0, teams.length - MAX_TEAMS);
		for (const teamId of toRemove) {
			clearTeamCache(teamId);
		}
	}
}
