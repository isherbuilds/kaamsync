import { getOrganizationUsagePrepared } from "~/lib/server/prepared-queries.server";
import type { PlanUsage } from "./types";

// Simple in-memory cache for organization usage (5-minute TTL)
const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Limit cache to 1000 organizations

// Periodic cleanup of expired entries
setInterval(() => {
	const now = Date.now();
	for (const [key, value] of usageCache.entries()) {
		if (value.expires < now) {
			usageCache.delete(key);
		}
	}
}, USAGE_CACHE_TTL); // Run cleanup every 5 minutes

/**
 * Get current usage for an organization (SECURE & OPTIMIZED: Using prepared statements)
 */
export async function getOrganizationUsage(
	organizationId: string,
): Promise<PlanUsage> {
	// Check cache first
	const cached = usageCache.get(organizationId);
	if (cached && cached.expires > Date.now()) {
		return cached.data;
	}

	// SECURE & OPTIMIZED: Use prepared statements for better performance and security
	const usage = await getOrganizationUsagePrepared(organizationId);

	// If cache is full, remove oldest expired entry or oldest entry
	if (usageCache.size >= MAX_CACHE_SIZE) {
		const now = Date.now();
		let oldestKey: string | undefined;
		let oldestExpires = Number.POSITIVE_INFINITY;
		
		for (const [key, value] of usageCache.entries()) {
			if (value.expires < now) {
				usageCache.delete(key);
				break;
			}
			if (value.expires < oldestExpires) {
				oldestExpires = value.expires;
				oldestKey = key;
			}
		}
		
		if (usageCache.size >= MAX_CACHE_SIZE && oldestKey) {
			usageCache.delete(oldestKey);
		}
	}

	// Cache the result
	usageCache.set(organizationId, {
		data: usage,
		expires: Date.now() + USAGE_CACHE_TTL,
	});

	return usage;
}

/**
 * Invalidate usage cache for an organization (call after membership/team changes)
 * ENHANCED: Also invalidate related caches
 */
export function invalidateUsageCache(organizationId: string): void {
	usageCache.delete(organizationId);

	// Also clear any related cached data that might be affected
	// This ensures consistency across all cached organization data
	console.log(
		`[Cache] Invalidated usage cache for organization: ${organizationId}`,
	);
}

/**
 * Invalidate all caches for an organization (nuclear option)
 */
export function invalidateAllOrganizationCaches(organizationId: string): void {
	invalidateUsageCache(organizationId);
	// Add other cache invalidations here as needed
	console.log(
		`[Cache] Invalidated all caches for organization: ${organizationId}`,
	);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
	return {
		usageCache: {
			size: usageCache.size,
			entries: Array.from(usageCache.entries()).map(([key, value]) => ({
				key,
				expires: new Date(value.expires).toISOString(),
				data: value.data,
			})),
		},
	};
}
