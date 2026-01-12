/**
 * Query Cache Policies - TTL-based caching for Zero.
 * Following zbugs pattern: simple, minimal cache policies.
 *
 * Zero caches to IndexedDB, so data persists across sessions.
 * TTL controls how long queries stay subscribed on the server.
 */

// Short cache for one-time/interactive queries
export const CACHE_NONE = { ttl: "none" } as const; // No caching for one-time queries
export const CACHE_REALTIME = { ttl: "15s" } as const; // For live data that changes frequently (reduced from 30s)

// Navigation and user-specific data
export const CACHE_NAV = { ttl: "90s" } as const; // Navigation data (teams, orgs) - reduced for freshness
export const CACHE_USER_DATA = { ttl: "2m" } as const; // User-specific data (assignments, tasks) - slightly reduced

// Preloading and reference data
export const CACHE_PRELOAD = { ttl: "3m" } as const; // Preloaded data for instant switching - reduced
export const CACHE_LONG = { ttl: "7m" } as const; // Reference data (statuses, labels, members) - reduced
export const CACHE_STATIC = { ttl: "15m" } as const; // Static/rarely changing data - increased slightly
