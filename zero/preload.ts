// @ts-nocheck
import type { Zero } from "@rocicorp/zero";
import type { Mutators } from "./mutators";
import type { QueryContext } from "./queries";
import { queries } from "./queries";
import { CACHE_NAV, CACHE_PRELOAD } from "./query-cache-policy";
import type { Schema } from "./schema";

// Simple tracking to avoid redundant preloads (following zbugs pattern)
const preloadedWorkspaces = new Set<string>();
let globalPreloadDone = false;

export function preloadAll(z: Zero<Schema, Mutators>, ctx: QueryContext) {
	if (!ctx.sub || !ctx.activeOrganizationId || globalPreloadDone) return;

	globalPreloadDone = true;
	preloadedWorkspaces.clear();

	// Essential navigation data
	z.preload(queries.getOrganizationList(ctx), CACHE_PRELOAD);
	z.preload(queries.getWorkspacesList(ctx), CACHE_PRELOAD);
	z.preload(queries.getUserAssignedMatters(ctx), CACHE_PRELOAD);
	z.preload(queries.getUserAuthoredMatters(ctx), CACHE_PRELOAD);
	z.preload(queries.getOrganizationLabels(ctx), CACHE_PRELOAD);
	z.preload(queries.getOrganizationMembers(ctx), CACHE_PRELOAD);
}

/**
 * Preloads all workspaces after workspace list is available.
 * Call this once you have the workspace IDs.
 * Uses the SAME per-workspace queries that components use for cache hits.
 */
export function preloadAllWorkspaces(
	z: Zero<Schema, Mutators>,
	ctx: QueryContext,
	workspaceIds: string[],
) {
	if (!ctx.sub || !ctx.activeOrganizationId) return;
	// Preload all workspaces - Zero handles this efficiently
	for (const id of workspaceIds) {
		preloadWorkspace(z, ctx, id);
	}
}

/**
 * Preloads workspace data for instant switching.
 * Zero caches to IndexedDB so subsequent loads are instant.
 */
export function preloadWorkspace(
	z: Zero<Schema, Mutators>,
	ctx: QueryContext,
	workspaceId: string,
) {
	if (!ctx.sub || !ctx.activeOrganizationId || !workspaceId) return;

	const key = `${ctx.activeOrganizationId}:${workspaceId}`;

	preloadedWorkspaces.add(key);

	// Use CACHE_NAV to match component - this is critical for cache hit
	z.preload(queries.getWorkspaceMatters(ctx, workspaceId), CACHE_NAV);
	z.preload(queries.getWorkspaceMembers(ctx, workspaceId), CACHE_NAV);
	z.preload(queries.getWorkspaceStatuses(ctx, workspaceId), CACHE_NAV);
}

/**
 * Preloads all workspace matters for instant switching.
 */
export function preloadAllWorkspaceMatters(
	z: Zero<Schema, Mutators>,
	ctx: QueryContext,
	workspaceIds: string[],
	max = 10,
) {
	if (!ctx.sub || !ctx.activeOrganizationId) return;
	for (const id of workspaceIds.slice(0, max)) {
		preloadWorkspace(z, ctx, id);
	}
}

/**
 * Preloads adjacent workspaces for instant navigation.
 */
export function preloadAdjacentWorkspaces(
	z: Zero<Schema, Mutators>,
	ctx: QueryContext,
	workspaceIds: string[],
	max = 3,
) {
	if (!ctx.sub || !ctx.activeOrganizationId) return;
	const toPreload = workspaceIds
		.filter(
			(id) => !preloadedWorkspaces.has(`${ctx.activeOrganizationId}:${id}`),
		)
		.slice(0, max);
	// Preload immediately - no delay needed, Zero handles async well
	for (const id of toPreload) {
		preloadWorkspace(z, ctx, id);
	}
}

/** Clears preload cache. Call on logout or org switch. */
export function clearPreloadCache() {
	preloadedWorkspaces.clear();
	globalPreloadDone = false;
}
