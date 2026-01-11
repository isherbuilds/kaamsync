import { logger } from "~/lib/logger";
import { getOrganizationUsagePrepared } from "~/lib/server/prepared-queries.server";
import type { PlanUsage } from "./types";

// Simple in-memory cache for organization usage (5-minute TTL)
const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
// Track in-flight requests to dedupe parallel callers
const inFlightRequests = new Map<string, Promise<PlanUsage>>();
const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Limit cache to 1000 organizations

// Periodic cleanup of expired entries (unref'd to not block process exit)
const cleanupInterval = setInterval(() => {
	const now = Date.now();
	for (const [key, value] of usageCache.entries()) {
		if (value.expires < now) {
			usageCache.delete(key);
		}
	}
}, USAGE_CACHE_TTL); // Run cleanup every 5 minutes
cleanupInterval.unref();

// Export for graceful shutdown if needed
export function stopCacheCleanup(): void {
	clearInterval(cleanupInterval);
}

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

	// Dedupe concurrent misses by sharing the same in-flight promise.
	// All concurrent callers await the same promise; once it settles we clear it so
	// subsequent requests can retry after errors.
	let usagePromise = inFlightRequests.get(organizationId);
	if (!usagePromise) {
		// Cache the promise and always cleanup when it settles.
		usagePromise = getOrganizationUsagePrepared(organizationId).finally(() => {
			// Clear from in-flight map after resolution (success or failure)
			inFlightRequests.delete(organizationId);
		});
		inFlightRequests.set(organizationId, usagePromise);
	}

	// SECURE & OPTIMIZED: Use prepared statements for better performance and security
	let usage: PlanUsage;
	try {
		usage = await usagePromise;
	} catch (error) {
		logger.error("Failed to get organization usage", {
			function: "getOrganizationUsage",
			organizationId,
			error,
		});
		throw error;
	}

	// If cache is full, remove all expired entries and track oldest non-expired entry
	if (usageCache.size >= MAX_CACHE_SIZE) {
		const now = Date.now();
		let oldestKey: string | undefined;
		let oldestExpires = Number.POSITIVE_INFINITY;

		// Delete all expired entries and track oldest non-expired entry
		for (const [key, value] of usageCache.entries()) {
			if (value.expires < now) {
				usageCache.delete(key);
			} else if (value.expires < oldestExpires) {
				oldestExpires = value.expires;
				oldestKey = key;
			}
		}

		// If cache is still full after removing expired entries, evict oldest non-expired
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
 */
export function invalidateUsageCache(organizationId: string): void {
	usageCache.delete(organizationId);

	logger.info("Invalidated usage cache entry", {
		function: "invalidateUsageCache",
		organizationId,
	});
}

/**
 * Invalidate all caches for an organization (nuclear option)
 */
export function invalidateAllOrganizationCaches(organizationId: string): void {
	invalidateUsageCache(organizationId);
	// Add other cache invalidations here as needed
	logger.info("Invalidated all caches for organization", {
		function: "invalidateAllOrganizationCaches",
		organizationId,
	});
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
				// Omit sensitive data; include only metadata
				isExpired: value.expires < Date.now(),
			})),
		},
	};
}
