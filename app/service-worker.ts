/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { setCacheNameDetails } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
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

const SHELL_CACHE = "KaamSync-shell";
const STATIC_CACHE = "KaamSync-static";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
	event.waitUntil(
		Promise.all([
			self.skipWaiting(),
			caches.open(SHELL_CACHE).then((cache) =>
				fetch(OFFLINE_URL, { cache: "reload" }).then((r) => {
					if (!r.ok)
						throw new Error(`Failed to fetch ${OFFLINE_URL}: ${r.status}`);
					return cache.put(OFFLINE_URL, r);
				}),
			),
		]),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") {
		void self.skipWaiting();
	}
});

setCacheNameDetails({ prefix: "KaamSync" });
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
	({ request }) => request.mode === "navigate",
	new NetworkFirst({
		cacheName: SHELL_CACHE,
		networkTimeoutSeconds: 3,
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 7 * 24 * 60 * 60,
			}),
		],
	}),
);

// Static assets: stale-while-revalidate with expiration
registerRoute(
	({ request }) =>
		request.destination === "script" ||
		request.destination === "style" ||
		request.destination === "font",
	new StaleWhileRevalidate({
		cacheName: STATIC_CACHE,
		plugins: [
			new CacheableResponsePlugin({ statuses: [0, 200] }),
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 30 * 24 * 60 * 60,
			}),
		],
	}),
);

// Fallback for failed navigations
setCatchHandler(async ({ request }) => {
	if (request.mode === "navigate") {
		const cached = await caches.match(OFFLINE_URL);
		if (cached) return cached;
	}
	return Response.error();
});

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
	} catch {
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
	const urlToOpen = new URL(
		event.notification.data?.url || "/",
		self.location.origin,
	).href;

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((windowClients) => {
				const matchingClient = windowClients.find(
					(client) =>
						new URL(client.url, self.location.origin).href === urlToOpen,
				);
				if (matchingClient) return matchingClient.focus();
				return self.clients.openWindow(urlToOpen);
			}),
	);
});

self.addEventListener("sync", (event) => {
	const syncEvent = event as SyncEvent;
	if (syncEvent.tag === "sync-data") {
		syncEvent.waitUntil(Promise.resolve());
	}
});
