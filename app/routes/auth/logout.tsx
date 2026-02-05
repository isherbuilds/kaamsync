import { dropAllDatabases } from "@rocicorp/zero";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { clearAuthSession } from "~/lib/auth/offline";
import { clearSubscriptionCache } from "~/lib/billing/offline";
import { warn } from "~/lib/utils/logger";

export function loader() {
	return redirect("/login");
}

export async function clientAction() {
	await authClient.signOut();

	const cleanups = [
		{ name: "Auth Session", fn: clearAuthSession },
		{ name: "Subscription Cache", fn: clearSubscriptionCache },
		{ name: "LocalStorage", fn: () => localStorage.clear() },
		{
			name: "IndexedDB",
			fn: async () => {
				await dropAllDatabases();
				const dbs = await window.indexedDB.databases();
				for (const db of dbs) {
					if (db.name) window.indexedDB.deleteDatabase(db.name);
				}
			},
		},
		{
			name: "Cache Storage",
			fn: async () => {
				if (typeof caches === "undefined") return;
				const keys = await caches.keys();
				await Promise.all(
					keys
						.filter((k) => k.startsWith("KaamSync"))
						.map((k) => caches.delete(k)),
				);
			},
		},
	];

	await Promise.allSettled(
		cleanups.map(async ({ name, fn }) => {
			try {
				await fn();
			} catch (e) {
				warn(`[Logout] Failed to clear ${name}`, e);
			}
		}),
	);

	return redirect("/");
}
