/**
 * Query Cache Policies - TTL-based caching for Zero.
 * Following zbugs pattern: simple, minimal cache policies.
 *
 * Zero caches to IndexedDB, so data persists across sessions.
 * TTL controls how long queries stay subscribed on the server.
 */

// Short cache for one-time/interactive queries
export const CACHE_NONE = { ttl: "none" } as const; // No caching for one-time queries
export const CACHE_REALTIME = { ttl: "30s" } as const; // For live data that changes frequently

// Navigation and user-specific data
export const CACHE_NAV = { ttl: "2m" } as const; // Navigation data (teams, orgs)
export const CACHE_USER_DATA = { ttl: "3m" } as const; // User-specific data (assignments, tasks)

// Preloading and reference data
export const CACHE_PRELOAD = { ttl: "5m" } as const; // Preloaded data for instant switching
export const CACHE_LONG = { ttl: "10m" } as const; // Reference data (statuses, labels, members)
export const CACHE_STATIC = { ttl: "10m" } as const; // Static/rarely changing data
