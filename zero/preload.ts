import type { Zero } from "@rocicorp/zero";
import { queries } from "./queries";
import { CACHE_LONG, CACHE_NAV, CACHE_PRELOAD } from "./query-cache-policy";

// Per-instance tracking to avoid redundant preloads (following zbugs pattern)
const preloadedWorkspaces = new WeakMap<Zero, Set<string>>();
const preloadedInstances = new WeakSet<Zero>();

/**
 * Preloads essential data for the app.
 * Context is automatically provided by Zero - no manual passing needed.
 */
export function preloadAll(z: Zero) {
	if (preloadedInstances.has(z)) return;

	preloadedInstances.add(z);
	// No global clear; per-instance cache is handled by WeakMap

	// Essential navigation data - context comes from ZeroProvider
	z.preload(queries.getOrganizationList(), CACHE_PRELOAD);
	z.preload(queries.getWorkspacesList(), CACHE_PRELOAD);
	z.preload(queries.getUserAssignedMatters(), CACHE_PRELOAD);
	z.preload(queries.getUserAuthoredMatters(), CACHE_PRELOAD);
	z.preload(queries.getOrganizationLabels(), CACHE_PRELOAD);
	z.preload(queries.getOrganizationMembers(), CACHE_PRELOAD);
}

/**
 * Preloads all workspaces after workspace list is available.
 * Call this once you have the workspace IDs.
 * Uses the SAME per-workspace queries that components use for cache hits.
 */
export function preloadAllWorkspaces(
	z: Zero,
	workspaceIds: string[],
	activeOrgId?: string,
) {
	// Preload all workspaces - Zero handles this efficiently
	for (const id of workspaceIds) {
		preloadWorkspace(z, id, activeOrgId);
	}
}

/**
 * Preloads workspace data for instant switching.
 * Zero caches to IndexedDB so subsequent loads are instant.
 */
export function preloadWorkspace(
	z: Zero,
	workspaceId: string,
	activeOrgId?: string,
) {
	if (!workspaceId) return;

	let instanceSet = preloadedWorkspaces.get(z);
	if (!instanceSet) {
		instanceSet = new Set<string>();
		preloadedWorkspaces.set(z, instanceSet);
	}

	const key = `${activeOrgId ?? "default"}:${workspaceId}`;
	if (instanceSet.has(key)) return;

	// Use CACHE_NAV to match component - this is critical for cache hit
	z.preload(queries.getWorkspaceMatters({ workspaceId }), CACHE_NAV);
	z.preload(queries.getWorkspaceStatuses({ workspaceId }), CACHE_LONG);

	instanceSet.add(key);
}

/**
 * Preloads all workspace matters for instant switching.
 */
export function preloadAllWorkspaceMatters(
	z: Zero,
	workspaceIds: string[],
	max = 10,
	activeOrgId?: string,
) {
	for (const id of workspaceIds.slice(0, max)) {
		preloadWorkspace(z, id, activeOrgId);
	}
}

/**
 * Preloads adjacent workspaces for instant navigation.
 */
export function preloadAdjacentWorkspaces(
	z: Zero,
	workspaceIds: string[],
	max = 3,
	activeOrgId?: string,
) {
	let instanceSet = preloadedWorkspaces.get(z);
	if (!instanceSet) {
		instanceSet = new Set<string>();
		preloadedWorkspaces.set(z, instanceSet);
	}
	const toPreload = workspaceIds
		.filter((id) => !instanceSet.has(`${activeOrgId ?? "default"}:${id}`))
		.slice(0, max);
	// Preload immediately - no delay needed, Zero handles async well
	for (const id of toPreload) {
		preloadWorkspace(z, id, activeOrgId);
	}
}

export function clearPreloadCache(z?: Zero) {
	if (z) {
		preloadedWorkspaces.delete(z);
	}
}
