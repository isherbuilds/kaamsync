import type { Zero } from "@rocicorp/zero";
import { queries } from "./queries";
import { CACHE_LONG, CACHE_NAV, CACHE_PRELOAD } from "./query-cache-policy";

// Per-instance tracking to avoid redundant preloads (following zbugs pattern)
const preloadedTeams = new WeakMap<Zero, Set<string>>();
const preloadedInstances = new WeakSet<Zero>();

export function preloadAll(z: Zero) {
	if (preloadedInstances.has(z)) return;
	preloadedInstances.add(z);

	z.preload(queries.getOrganizationList(), CACHE_PRELOAD);
	z.preload(queries.getTeamsList(), CACHE_PRELOAD);
	z.preload(queries.getUserAssignedMatters(), CACHE_PRELOAD);
	z.preload(queries.getUserAuthoredMatters(), CACHE_PRELOAD);
	z.preload(queries.getOrganizationLabels(), CACHE_PRELOAD);
	z.preload(queries.getOrganizationMembers(), CACHE_PRELOAD);
}

/**
 * Preloads all teams after team list is available.
 * Call this once you have the team IDs.
 * Uses the SAME per-team queries that components use for cache hits.
 */
export function preloadAllTeams(
	z: Zero,
	teamIds: string[],
	activeOrgId?: string,
) {
	// Preload all teams - Zero handles this efficiently
	for (const id of teamIds) {
		preloadTeam(z, id, activeOrgId);
	}
}

/**
 * Preloads team data for instant switching.
 * Zero caches to IndexedDB so subsequent loads are instant.
 */
export function preloadTeam(z: Zero, teamId: string, activeOrgId?: string) {
	if (!teamId) return;

	let instanceSet = preloadedTeams.get(z);
	if (!instanceSet) {
		instanceSet = new Set<string>();
		preloadedTeams.set(z, instanceSet);
	}

	const key = `${activeOrgId ?? "default"}:${teamId}`;
	if (instanceSet.has(key)) return;

	// Use CACHE_NAV to match component - this is critical for cache hit
	z.preload(queries.getTeamMatters({ teamId }), CACHE_NAV);
	z.preload(queries.getTeamStatuses({ teamId }), CACHE_LONG);

	instanceSet.add(key);
}

/**
 * Preloads all team matters for instant switching.
 */
export function preloadAllTeamMatters(
	z: Zero,
	teamIds: string[],
	max = 10,
	activeOrgId?: string,
) {
	for (const id of teamIds.slice(0, max)) {
		preloadTeam(z, id, activeOrgId);
	}
}

/**
 * Preloads adjacent teams for instant navigation.
 */
export function preloadAdjacentTeams(
	z: Zero,
	teamIds: string[],
	max = 3,
	activeOrgId?: string,
) {
	let instanceSet = preloadedTeams.get(z);
	if (!instanceSet) {
		instanceSet = new Set<string>();
		preloadedTeams.set(z, instanceSet);
	}
	const toPreload = teamIds
		.filter((id) => !instanceSet.has(`${activeOrgId ?? "default"}:${id}`))
		.slice(0, max);
	// Preload immediately - no delay needed, Zero handles async well
	for (const id of toPreload) {
		preloadTeam(z, id, activeOrgId);
	}
}

export function clearPreloadCache(z?: Zero) {
	if (z) {
		preloadedTeams.delete(z);
	}
}
