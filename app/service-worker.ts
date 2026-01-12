/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { setCacheNameDetails } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<import("workbox-precaching").PrecacheEntry | string>;
};

interface SyncEvent extends Event {
	readonly tag: string;
	readonly lastChance: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Standard SW API uses any
	waitUntil(promise: Promise<any>): void;
}

interface ServiceWorkerRegistration {
	readonly sync: SyncManager;
}

interface SyncManager {
	register(tag: string): Promise<void>;
	getTags(): Promise<string[]>;
}

const SHELL_CACHE = "KaamSync-shell";
const STATIC_CACHE = "KaamSync-static";
const SHELL_URLS = ["/", "/offline.html"];

// Immediately take control
self.addEventListener("install", (event) => {
	event.waitUntil(
		Promise.all([
			self.skipWaiting(),
			caches.open(SHELL_CACHE).then((cache) =>
				Promise.all(
					SHELL_URLS.map((url) =>
						fetch(url, { cache: "reload" })
							.then((r) => {
								if (!r.ok) {
									throw new Error(`Failed to fetch ${url}: ${r.status}`);
								}
								return cache.put(url, r);
							})
							.catch((e) => {
								console.error(`[SW] Precache failed for ${url}`, e);
								throw e; // Fail installation if critical shell resources can't be cached
							}),
					),
				),
			),
		]),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") void self.skipWaiting();
});

setCacheNameDetails({ prefix: "KaamSync" });
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation: network-first with shell fallback
registerRoute(
	({ request }) => request.mode === "navigate",
	new NetworkFirst({
		cacheName: SHELL_CACHE,
		networkTimeoutSeconds: 3,
		plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
	}),
);

// Static assets: stale-while-revalidate
registerRoute(
	({ request }) =>
		request.destination === "script" ||
		request.destination === "style" ||
		request.destination === "font",
	new StaleWhileRevalidate({
		cacheName: STATIC_CACHE,
		plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
	}),
);

// Fallback for failed navigations
setCatchHandler(async ({ request }) => {
	if (request.mode === "navigate") {
		// Try to serve the app shell first
		for (const url of SHELL_URLS) {
			const cached = await caches.match(url);
			if (cached) return cached;
		}

		// If shell is missing/fails, try offline.html
		const offlineCache = await caches.match("/offline.html");
		if (offlineCache) return offlineCache;
	}
	return Response.error();
});

// Push Notifications
self.addEventListener("push", (event) => {
	try {
		const data = event.data ? event.data.json() : {};
		const title = data.title || "KaamSync Update";
		const options: NotificationOptions = {
			body: data.body || "You have a new notification",
			icon: "/web-app-manifest-192x192.png",
			badge: "/favicon-96x96.png",
			tag: data.tag || "general",
			data: data.data || {},
		};
		event.waitUntil(self.registration.showNotification(title, options));
	} catch (error) {
		console.error("[SW] Push event error:", error);
		// Show a generic notification even if parsing fails
		event.waitUntil(
			self.registration.showNotification("KaamSync Update", {
				body: "You have a new notification",
				icon: "/web-app-manifest-192x192.png",
			}),
		);
	}
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients
			.matchAll({
				type: "window",
				includeUncontrolled: true,
			})
			.then((windowClients) => {
				const matchingClient = windowClients.find(
					(client) => client.url === urlToOpen,
				);
				if (matchingClient) {
					return matchingClient.focus();
				}
				return self.clients.openWindow(urlToOpen);
			}),
	);
});

// Background Sync
self.addEventListener("sync", (event) => {
	const syncEvent = event as SyncEvent;
	if (syncEvent.tag === "sync-data") {
		// Implement your sync logic here or import it
		// e.g., event.waitUntil(syncData());
		console.log("Background sync triggered");
	}
});
