// Simple per-workspace short ID cache using localStorage.
// Provides a best-effort offline sequence; server remains authoritative.

const KEY_PREFIX = "bt:nextShortId:";
const VERSION_KEY = "bt:shortIdCache:version";
const CURRENT_VERSION = "1";
const MAX_WORKSPACES = 100; // Prevent localStorage bloat

function getKey(workspaceId: string) {
	return `${KEY_PREFIX}${workspaceId}`;
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
		clearAllWorkspaces();
		localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
	}
}

export function seedNextShortId(workspaceId: string, next: number) {
	if (typeof localStorage === "undefined") return;
	checkVersion();
	if (!Number.isFinite(next) || next < 1) return;
	const key = getKey(workspaceId);
	const current = safeParseInt(localStorage.getItem(key));
	if (!current || current < next) {
		localStorage.setItem(key, String(next));
		enforceMaxWorkspaces();
	}
}

export function peekNextShortId(workspaceId: string): number | undefined {
	if (typeof localStorage === "undefined") return undefined;
	checkVersion();
	const key = getKey(workspaceId);
	return safeParseInt(localStorage.getItem(key));
}

export function getAndIncrementNextShortId(workspaceId: string): number {
	if (typeof localStorage === "undefined") return 0;
	checkVersion();
	const key = getKey(workspaceId);
	const current = safeParseInt(localStorage.getItem(key)) ?? 1;
	// Store next value
	localStorage.setItem(key, String(current + 1));
	enforceMaxWorkspaces();
	return current;
}

/**
 * Clear cache for a specific workspace
 */
export function clearWorkspaceCache(workspaceId: string) {
	if (typeof localStorage === "undefined") return;
	localStorage.removeItem(getKey(workspaceId));
}

/**
 * Clear all workspace caches
 */
function clearAllWorkspaces() {
	if (typeof localStorage === "undefined") return;
	const keys = Object.keys(localStorage).filter((k) => k.startsWith(KEY_PREFIX));
	for (const key of keys) {
		localStorage.removeItem(key);
	}
}

/**
 * Get all cached workspace IDs (for debugging)
 */
export function getAllCachedWorkspaces(): string[] {
	if (typeof localStorage === "undefined") return [];
	const keys = Object.keys(localStorage).filter((k) => k.startsWith(KEY_PREFIX));
	return keys.map((k) => k.replace(KEY_PREFIX, ""));
}

/**
 * Enforce max workspace limit by removing oldest entries
 */
function enforceMaxWorkspaces() {
	if (typeof localStorage === "undefined") return;
	const workspaces = getAllCachedWorkspaces();
	if (workspaces.length > MAX_WORKSPACES) {
		// Remove oldest (first in list)
		const toRemove = workspaces.slice(0, workspaces.length - MAX_WORKSPACES);
		for (const wsId of toRemove) {
			clearWorkspaceCache(wsId);
		}
	}
}
