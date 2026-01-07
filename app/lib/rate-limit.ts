/**
 * Simple rate limiter using a sliding window approach
 * For server-side or client-side use
 */

interface RateLimitEntry {
	timestamps: number[];
}

// Store rate limit state (in-memory, reset on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_STORE_SIZE = 10000; // Prevent unbounded growth

/**
 * Check if an action should be rate limited
 * @param key - Unique key for the rate limit (e.g., "checkout:org_123")
 * @param maxAttempts - Maximum attempts allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and optional retry time
 */
export function checkRateLimit(
	key: string,
	maxAttempts: number,
	windowMs: number,
): {
	allowed: boolean;
	remaining: number;
	retryAfterMs?: number;
} {
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	if (!entry) {
		// First attempt - allow and track
		rateLimitStore.set(key, { timestamps: [now] });
		return { allowed: true, remaining: maxAttempts - 1 };
	}

	// Filter timestamps within the window
	const validTimestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

	if (validTimestamps.length >= maxAttempts) {
		// Rate limited
		const oldestTimestamp = validTimestamps[0];
		const retryAfterMs = windowMs - (now - oldestTimestamp);
		return {
			allowed: false,
			remaining: 0,
			retryAfterMs,
		};
	}

	// Allow and track
	validTimestamps.push(now);
	
	// Implement LRU eviction if store is getting too large
	if (rateLimitStore.size >= MAX_STORE_SIZE) {
		// Remove oldest entry (simple LRU approximation)
		const firstKey = rateLimitStore.keys().next().value;
		if (firstKey) {
			rateLimitStore.delete(firstKey);
		}
	}
	
	rateLimitStore.set(key, { timestamps: validTimestamps });
	return {
		allowed: true,
		remaining: maxAttempts - validTimestamps.length,
	};
}

/**
 * Reset rate limit for a key (useful after successful action)
 */
export function resetRateLimit(key: string): void {
	rateLimitStore.delete(key);
}

/**
 * Checkout-specific rate limit check
 * 5 attempts per 60 seconds per organization
 */
export function checkCheckoutRateLimit(organizationId: string): {
	allowed: boolean;
	remaining: number;
	retryAfterSeconds?: number;
	message?: string;
} {
	const result = checkRateLimit(
		`checkout:${organizationId}`,
		5, // max 5 attempts
		60 * 1000, // 60 second window
	);

	if (!result.allowed) {
		const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 0) / 1000);
		return {
			allowed: false,
			remaining: 0,
			retryAfterSeconds,
			message: `Too many checkout attempts. Please try again in ${retryAfterSeconds} seconds.`,
		};
	}

	return {
		allowed: true,
		remaining: result.remaining,
	};
}

// Clean up old entries periodically (every 1 minute for better memory management)
if (typeof window === "undefined") {
	// Server-side only
	setInterval(
		() => {
			const now = Date.now();
			const windowMs = 2 * 60 * 1000; // 2 minute cleanup threshold (reduced from 5)

			for (const [key, entry] of rateLimitStore.entries()) {
				const validTimestamps = entry.timestamps.filter(
					(ts) => now - ts < windowMs,
				);
				if (validTimestamps.length === 0) {
					rateLimitStore.delete(key);
				} else {
					entry.timestamps = validTimestamps;
				}
			}
		},
		60 * 1000, // Run every 1 minute (reduced from 5)
	);
}
