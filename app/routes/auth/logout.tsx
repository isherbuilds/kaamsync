import { dropAllDatabases } from "@rocicorp/zero";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { clearAuthSessionFromLocalStorage } from "~/lib/auth/offline";
import { clearSubscriptionCache } from "~/lib/billing/offline";
import { warn } from "~/lib/utils/logger";

export function loader() {
	return redirect("/login");
}

export async function clientAction() {
	await authClient.signOut();

	try {
		clearAuthSessionFromLocalStorage();
	} catch (e) {
		warn("[Logout] Failed to clear auth session from localStorage", e);
	}

	try {
		clearSubscriptionCache();
	} catch (e) {
		warn("[Logout] Failed to clear subscription cache", e);
	}

	try {
		localStorage.clear();
	} catch (e) {
		warn("[Logout] localStorage.clear() failed", e);
	}

	try {
		await dropAllDatabases();
		const dbs = await window.indexedDB.databases();
		dbs.forEach((db: { name?: string }) => {
			if (db.name) {
				window.indexedDB.deleteDatabase(db.name);
			}
		});
	} catch (e) {
		warn("[Logout] Failed to clear IndexedDB", e);
	}

	if (typeof caches !== "undefined") {
		try {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((k) => k.startsWith("KaamSync"))
					.map((k) => caches.delete(k)),
			);
		} catch (e) {
			warn("[Logout] Failed to clear Cache Storage", e);
		}
	}

	return redirect("/");
}
