import { ClientCache, fetchNetworkFirst } from "~/lib/cache/client";
import type { Subscription } from "./service";

const CACHE_KEY = "KaamSync:subscription";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const subscriptionCache = new ClientCache<Subscription>(
	CACHE_KEY,
	CACHE_DURATION_MS,
);

export function getSubscriptionFromCache(orgSlug: string): Subscription | null {
	return subscriptionCache.get(orgSlug);
}

export function clearSubscriptionCache() {
	subscriptionCache.clearAll();
}

export async function getSubscriptionSWR(
	fetchFn: () => Promise<Subscription>,
	orgSlug: string,
): Promise<Subscription | null> {
	return fetchNetworkFirst(subscriptionCache, orgSlug, fetchFn);
}
