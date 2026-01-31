import { useEffect } from "react";
import { safeError } from "~/lib/utils/logger";

export function useServiceWorker(): void {
	useEffect(() => {
		const isServer = typeof window === "undefined";
		const isDevelopment = import.meta.env.DEV;

		if (isServer || isDevelopment) return;

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/service-worker.js").catch((error) => {
				safeError(error, "Service worker registration failed");
			});
		}
	}, []);
}
