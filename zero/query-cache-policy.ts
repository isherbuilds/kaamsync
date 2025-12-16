/**
 * Query Cache Policies - TTL-based caching for Zero.
 * Following zbugs pattern: simple, minimal cache policies.
 *
 * Zero caches to IndexedDB, so data persists across sessions.
 * TTL controls how long queries stay subscribed on the server.
 */

// Short cache for navigation/interactive queries
export const CACHE_NONE = { ttl: "10s" } as const;
export const CACHE_NAV = { ttl: "10s" } as const;
export const CACHE_PRELOAD = { ttl: "20s" } as const;

// Longer cache for reference data (labels, statuses, members)
export const CACHE_LONG = { ttl: "5m" } as const;
export const CACHE_STATIC = { ttl: "10m" } as const;
