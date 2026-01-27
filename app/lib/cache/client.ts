const DEFAULT_CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

export class ClientCache<T> {
	private memCache: Map<string, CacheEntry<T>> = new Map();
	private keyPrefix: string;
	private durationMs: number;

	constructor(keyPrefix: string, durationMs = DEFAULT_CACHE_DURATION_MS) {
		this.keyPrefix = keyPrefix;
		this.durationMs = durationMs;
	}

	private isExpired(timestamp: number): boolean {
		return Date.now() - timestamp > this.durationMs;
	}

	private getStorageKey(key: string): string {
		return `${this.keyPrefix}:${key}`;
	}

	getEntry(key: string): CacheEntry<T> | null {
		const mem = this.memCache.get(key);
		if (mem) {
			if (!this.isExpired(mem.timestamp)) return mem;
			this.memCache.delete(key);
		}

		if (typeof localStorage === "undefined") return null;

		try {
			const storageKey = this.getStorageKey(key);
			const raw = localStorage.getItem(storageKey);
			if (!raw) return null;

			const cached = JSON.parse(raw) as CacheEntry<T>;
			if (this.isExpired(cached.timestamp)) {
				this.remove(key);
				return null;
			}

			this.memCache.set(key, cached);
			return cached;
		} catch (e) {
			console.warn(`[ClientCache] Failed to load key ${key}`, e);
			return null;
		}
	}

	get(key: string): T | null {
		const entry = this.getEntry(key);
		return entry ? entry.data : null;
	}

	set(key: string, data: T | null): void {
		if (data === null) {
			this.remove(key);
			return;
		}

		const entry: CacheEntry<T> = { data, timestamp: Date.now() };

		this.memCache.set(key, entry);

		if (typeof localStorage !== "undefined") {
			try {
				localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));
			} catch (e) {
				console.warn(`[ClientCache] Failed to save key ${key}`, e);
			}
		}
	}

	remove(key: string): void {
		this.memCache.delete(key);
		if (typeof localStorage !== "undefined") {
			try {
				localStorage.removeItem(this.getStorageKey(key));
			} catch (e) {
				console.warn(`[ClientCache] Failed to remove key ${key}`, e);
			}
		}
	}
}

export interface SWROptions {
	refreshMaxAgeMs?: number;
	blockOnEmpty?: boolean;
	forceNetwork?: boolean;
}

export async function fetchWithSWR<T>(
	cache: ClientCache<T>,
	key: string,
	fetchFn: () => Promise<T>,
	options: SWROptions = {},
): Promise<T | null> {
	const {
		refreshMaxAgeMs = 60_000,
		blockOnEmpty = true,
		forceNetwork = false,
	} = options;

	if (forceNetwork) {
		try {
			const data = await fetchFn();
			cache.set(key, data);
			return data;
		} catch (e) {
			console.warn("[SWR] Network failed, falling back to cache", e);
			return cache.get(key);
		}
	}

	const cachedEntry = cache.getEntry(key);
	if (cachedEntry) {
		if (
			typeof navigator !== "undefined" &&
			navigator.onLine &&
			refreshMaxAgeMs > 0 &&
			Date.now() - cachedEntry.timestamp > refreshMaxAgeMs
		) {
			void fetchFn()
				.then((data) => cache.set(key, data))
				.catch(() => {
					/* ignore */
				});
		}
		return cachedEntry.data;
	}

	if (!blockOnEmpty) return null;

	try {
		const data = await fetchFn();
		cache.set(key, data);
		return data;
	} catch (e) {
		console.warn("[SWR] Fetch failed (blocking)", e);
		return null;
	}
}

export async function fetchNetworkFirst<T>(
	cache: ClientCache<T>,
	key: string,
	fetchFn: () => Promise<T>,
): Promise<T | null> {
	try {
		const data = await fetchFn();
		cache.set(key, data);
		return data;
	} catch (e) {
		console.warn("[NetworkFirst] Failed, checking cache", e);
		return cache.get(key);
	}
}
