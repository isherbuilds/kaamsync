import { isOffline } from "~/lib/auth/offline";
import { ClientCache, fetchNetworkFirst } from "~/lib/cache/client";
import type { Subscription } from "./service";

const CACHE_KEY = "KaamSync:subscription";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const subscriptionCache = new ClientCache<Subscription>(
	CACHE_KEY,
	CACHE_DURATION_MS,
);

export function getSubscription(orgSlug: string): Subscription | null {
	return subscriptionCache.get(orgSlug);
}

export function clearSubscriptionCache() {
	subscriptionCache.clearAll();
}

export async function getSubscriptionSWR(
	fetchFn: () => Promise<Subscription>,
	orgSlug: string,
): Promise<Subscription | null> {
	// When offline, return cache directly
	if (isOffline()) return subscriptionCache.get(orgSlug);
	return fetchNetworkFirst(subscriptionCache, orgSlug, fetchFn);
}
