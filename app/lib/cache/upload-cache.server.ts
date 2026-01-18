interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

class SimpleLRUCache<K, V> {
	private cache: Map<K, V>;
	private maxSize: number;

	constructor(maxSize: number = 1000) {
		this.cache = new Map();
		this.maxSize = maxSize;
	}

	get(key: K): V | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: K, value: V): void {
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
		this.cache.set(key, value);
	}

	delete(key: K): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
	}

	entries(): IterableIterator<[K, V]> {
		return this.cache.entries();
	}

	forEach(callback: (value: V, key: K, map: Map<K, V>) => void): void {
		this.cache.forEach(callback);
	}
}

class UploadCache {
	private presignedUrls: SimpleLRUCache<
		string,
		CacheEntry<{ uploadUrl: string; fileKey: string; publicUrl: string }>
	>;
	private storageLimits: SimpleLRUCache<
		string,
		CacheEntry<{ limits: any; usage: any }>
	>;
	private storageUsage: SimpleLRUCache<
		string,
		CacheEntry<{ totalBytes: number; totalGb: number; fileCount: number }>
	>;

	constructor() {
		this.presignedUrls = new SimpleLRUCache(500);
		this.storageLimits = new SimpleLRUCache(1000);
		this.storageUsage = new SimpleLRUCache(1000);
	}

	getPresignedUrl(
		orgId: string,
		contentType: string,
		fileSize: number,
		fileName: string,
	) {
		const key = this.getPresignedKey(orgId, contentType, fileSize, fileName);
		const entry = this.presignedUrls.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.presignedUrls.delete(key);
			return null;
		}

		return entry.value;
	}

	setPresignedUrl(
		orgId: string,
		contentType: string,
		fileSize: number,
		fileName: string,
		value: { uploadUrl: string; fileKey: string; publicUrl: string },
		ttlMs: number = 1000 * 60 * 5,
	) {
		const key = this.getPresignedKey(orgId, contentType, fileSize, fileName);
		this.presignedUrls.set(key, {
			value,
			expiresAt: Date.now() + Math.min(ttlMs, 1000 * 60 * 5),
		});
	}

	getStorageLimits(orgId: string) {
		const entry = this.storageLimits.get(orgId);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.storageLimits.delete(orgId);
			return null;
		}

		return entry.value;
	}

	setStorageLimits(
		orgId: string,
		value: { limits: any; usage: any },
		ttlMs: number = 1000 * 60 * 15,
	) {
		this.storageLimits.set(orgId, {
			value,
			expiresAt: Date.now() + Math.min(ttlMs, 1000 * 60 * 15),
		});
	}

	getStorageUsage(orgId: string) {
		const entry = this.storageUsage.get(orgId);
		if (!entry) return null;

		if (Date.now() > entry.expiresAt) {
			this.storageUsage.delete(orgId);
			return null;
		}

		return entry.value;
	}

	setStorageUsage(
		orgId: string,
		value: { totalBytes: number; totalGb: number; fileCount: number },
		ttlMs: number = 1000 * 60 * 5,
	) {
		this.storageUsage.set(orgId, {
			value,
			expiresAt: Date.now() + Math.min(ttlMs, 1000 * 60 * 5),
		});
	}

	invalidateOrg(orgId: string) {
		this.storageLimits.delete(orgId);
		this.storageUsage.delete(orgId);

		for (const [key] of this.presignedUrls.entries()) {
			if (key.startsWith(`presigned:${orgId}:`)) {
				this.presignedUrls.delete(key);
			}
		}
	}

	clear() {
		this.presignedUrls.clear();
		this.storageLimits.clear();
		this.storageUsage.clear();
	}

	private getPresignedKey(
		orgId: string,
		contentType: string,
		fileSize: number,
		fileName: string,
	) {
		return `presigned:${orgId}:${contentType}:${fileSize}:${fileName}`;
	}
}

export const uploadCache = new UploadCache();
