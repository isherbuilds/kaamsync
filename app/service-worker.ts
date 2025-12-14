/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { setCacheNameDetails } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope & {
	__WB_MANIFEST: Array<import("workbox-precaching").PrecacheEntry | string>;
};

const SHELL_CACHE = "KaamSync-shell";
const STATIC_CACHE = "KaamSync-static";
const SHELL_URLS = ["/"];

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
								if (r.ok) cache.put(url, r);
							})
							.catch(() => {}),
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
		for (const url of SHELL_URLS) {
			const cached = await caches.match(url);
			if (cached) return cached;
		}
	}
	return Response.error();
});
