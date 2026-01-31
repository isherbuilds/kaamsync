/**
 * LRU (Least Recently Used) Cache implementation
 *
 * Based on zbugs pattern (rocicorp/mono/apps/zbugs/src/lru-cache.ts)
 * Used for client-side caching of computed values, measurements, etc.
 *
 * @example
 * ```tsx
 * // Cache virtualized list item heights
 * const heightCache = new LRUCache<string, number>(500);
 * heightCache.set(itemId, measuredHeight);
 * const cached = heightCache.get(itemId);
 * ```
 */
export class LRUCache<K, V> {
	// How often to run a more-expensive memory pressure check on gets.
	// Must be a power of two to allow fast modulus via bitmask.
	static readonly GET_CHECK_FREQUENCY = 128;

	readonly #maxSize: number;
	readonly #cache: Map<K, V>;
	readonly #memoryPressureThreshold: number;
	#lastCleanup: number;
	#_getCounter = 0; // lightweight counter; intentionally not shared across threads
	constructor(maxSize: number, memoryPressureThreshold = 0.8) {
		if (maxSize <= 0) {
			throw new Error("LRUCache maxSize must be positive");
		}
		if (
			!Number.isFinite(memoryPressureThreshold) ||
			memoryPressureThreshold <= 0 ||
			memoryPressureThreshold >= 1
		) {
			throw new Error(
				"LRUCache memoryPressureThreshold must be a finite number in the range (0, 1)",
			);
		}
		this.#maxSize = maxSize;
		this.#cache = new Map();
		this.#memoryPressureThreshold = memoryPressureThreshold;
		this.#lastCleanup = Date.now();
	}

	/**
	 * Check for memory pressure and cleanup if needed.
	 *
	 * This method is intentionally invoked only on mutations (`set()`) and
	 * periodically from `get()` (sampled every `GET_CHECK_FREQUENCY` reads) to
	 * avoid the Date.now() overhead on the hot read path.
	 */
	private checkMemoryPressure(): void {
		const now = Date.now();
		const timeSinceLastCleanup = now - this.#lastCleanup;

		// Only check for memory pressure every 30 seconds
		if (timeSinceLastCleanup < 30000) return;

		const usageRatio = this.#cache.size / this.#maxSize;

		// If we're above the threshold, aggressively cleanup
		if (usageRatio > this.#memoryPressureThreshold) {
			const targetSize = Math.floor(this.#maxSize * 0.6); // Reduce to 60%
			const itemsToRemove = this.#cache.size - targetSize;

			const keysToRemove = Array.from(this.#cache.keys()).slice(
				0,
				itemsToRemove,
			);
			for (const key of keysToRemove) {
				this.#cache.delete(key);
			}
		}

		this.#lastCleanup = now;
	}

	/**
	 * Get a value from cache. Moves item to "most recently used" position.
	 *
	 * This is a hot path; avoid expensive operations here. We increment a
	 * lightweight counter and only perform memory-pressure checks every
	 * GET_CHECK_FREQUENCY calls to avoid adding Date.now() overhead to each
	 * read. `set()` still performs checks on mutation.
	 */
	get(key: K): V | undefined {
		const value = this.#cache.get(key);
		if (value === undefined) {
			return undefined;
		}
		// Move to end (most recently used)
		this.#cache.delete(key);
		this.#cache.set(key, value);

		// Lightweight sampling to avoid Date.now() on every get.
		// Use a power-of-two `GET_CHECK_FREQUENCY` so we can use a fast bitmask.
		if ((++this.#_getCounter & (LRUCache.GET_CHECK_FREQUENCY - 1)) === 0) {
			this.checkMemoryPressure();
		}

		return value;
	}

	/**
	 * Set a value in cache. Evicts oldest item if at capacity.
	 */
	set(key: K, value: V): void {
		// Check memory pressure before adding new items
		this.checkMemoryPressure();

		// If key exists, delete it first to update position
		if (this.#cache.has(key)) {
			this.#cache.delete(key);
		} else if (this.#cache.size >= this.#maxSize) {
			// Evict oldest (first item in iteration order)
			const firstKey = this.#cache.keys().next().value;
			if (firstKey !== undefined) {
				this.#cache.delete(firstKey);
			}
		}
		this.#cache.set(key, value);
	}

	/**
	 * Check if key exists in cache (without affecting LRU order)
	 */
	has(key: K): boolean {
		return this.#cache.has(key);
	}

	/**
	 * Delete a specific key from cache
	 */
	delete(key: K): boolean {
		return this.#cache.delete(key);
	}

	/**
	 * Clear all entries from cache
	 */
	clear(): void {
		this.#cache.clear();
	}

	/**
	 * Get current cache size
	 */
	get size(): number {
		return this.#cache.size;
	}

	/**
	 * Get maximum cache size
	 */
	get maxSize(): number {
		return this.#maxSize;
	}
}

// ============================================================================
// Specialized caches for common use cases
// ============================================================================

/**
 * Cache for virtualized list item sizes/heights
 * Persist measurements to avoid recalculation on scroll
 * Memory pressure threshold at 80% usage
 */
export const itemSizeCache = new LRUCache<string, number>(1000, 0.8);

/**
 * Cache for computed/derived values that are expensive to calculate
 * Lower threshold for computed values as they can be recreated
 */
export const computedCache = new LRUCache<string, unknown>(200, 0.7);

/**
 * Sample values and compute running average (for estimateSize in virtualizers)
 * Uses a circular buffer approach for O(1) insertions.
 *
 * @param samples Array to store samples in (mutated)
 * @param value New value to add
 * @param maxSamples Maximum samples to keep
 */
export function sample(
	samples: number[],
	value: number,
	maxSamples = 20,
): void {
	if (samples.length >= maxSamples) {
		// O(1) circular shift: replace oldest instead of shifting entire array
		samples.copyWithin(0, 1);
		samples[maxSamples - 1] = value;
	} else {
		samples.push(value);
	}
}

/**
 * Compute average of samples - O(n) single pass
 */
export function average(samples: number[]): number {
	const len = samples.length;
	if (len === 0) return 0;
	let sum = 0;
	for (let i = 0; i < len; i++) {
		sum += samples[i];
	}
	return sum / len;
}
