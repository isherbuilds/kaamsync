import { dropAllDatabases } from "@rocicorp/zero";
import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { clearAuthSessionFromLocalStorage } from "~/lib/auth/offline";
import { clearSubscriptionCache } from "~/lib/billing/offline";

export function loader() {
	return redirect("/login");
}

export async function clientAction() {
	await authClient.signOut();

	// Clear localStorage-based session/cache entries
	try {
		clearAuthSessionFromLocalStorage();
	} catch (e) {
		console.warn("[Logout] Failed to clear auth session from localStorage", e);
	}

	try {
		clearSubscriptionCache();
	} catch (e) {
		console.warn("[Logout] Failed to clear subscription cache", e);
	}

	// Clear any remaining localStorage data
	try {
		localStorage.clear();
	} catch (e) {
		console.warn("[Logout] localStorage.clear() failed", e);
	}

	// Clear IndexedDB databases
	try {
		await dropAllDatabases();
		const dbs = await window.indexedDB.databases();
		dbs.forEach((db: { name?: string }) => {
			if (db.name) {
				window.indexedDB.deleteDatabase(db.name);
			}
		});
	} catch (e) {
		console.warn("[Logout] Failed to clear IndexedDB", e);
	}

	// Clear Cache Storage entries used by the service worker (prefix: KaamSync)
	if (typeof caches !== "undefined") {
		try {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((k) => k.startsWith("KaamSync"))
					.map((k) => caches.delete(k)),
			);
		} catch (e) {
			console.warn("[Logout] Failed to clear Cache Storage", e);
		}
	}

	return redirect("/");
}
