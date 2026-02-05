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

	const deleteIndexedDb = async (name: string) =>
		new Promise<void>((resolve, reject) => {
			const request = window.indexedDB.deleteDatabase(name);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
			request.onblocked = () => resolve();
		});

	try {
		await clearAuthSession();
	} catch (e) {
		warn("[Logout] Failed to clear Auth Session", e);
	}

	try {
		await clearSubscriptionCache();
	} catch (e) {
		warn("[Logout] Failed to clear Subscription Cache", e);
	}

	try {
		localStorage.clear();
	} catch (e) {
		warn("[Logout] Failed to clear LocalStorage", e);
	}

	const cleanups = [
		{
			name: "IndexedDB",
			fn: async () => {
				await dropAllDatabases();
				const dbs = await window.indexedDB.databases();
				await Promise.all(
					dbs
						.filter((db) => Boolean(db.name))
						.map((db) => deleteIndexedDb(db.name as string)),
				);
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
