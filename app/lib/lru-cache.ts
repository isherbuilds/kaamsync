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
	readonly #maxSize: number;
	readonly #cache: Map<K, V>;

	constructor(maxSize: number) {
		if (maxSize <= 0) {
			throw new Error("LRUCache maxSize must be positive");
		}
		this.#maxSize = maxSize;
		this.#cache = new Map();
	}

	/**
	 * Get a value from cache. Moves item to "most recently used" position.
	 */
	get(key: K): V | undefined {
		const value = this.#cache.get(key);
		if (value === undefined) {
			return undefined;
		}
		// Move to end (most recently used)
		this.#cache.delete(key);
		this.#cache.set(key, value);
		return value;
	}

	/**
	 * Set a value in cache. Evicts oldest item if at capacity.
	 */
	set(key: K, value: V): void {
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
 */
export const itemSizeCache = new LRUCache<string, number>(1000);

/**
 * Cache for computed/derived values that are expensive to calculate
 */
export const computedCache = new LRUCache<string, unknown>(200);

/**
 * Sample values and compute running average (for estimateSize in virtualizers)
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
		samples.shift();
	}
	samples.push(value);
}

/**
 * Compute average of samples
 */
export function average(samples: number[]): number {
	if (samples.length === 0) return 0;
	return samples.reduce((a, b) => a + b, 0) / samples.length;
}
