import { useEffect } from "react";

export function useServiceWorker() {
	useEffect(() => {
		if (typeof window === "undefined" || import.meta.env.DEV) return;

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/service-worker.js").catch((error) => {
				console.error("Service worker registration failed:", error);
			});
		}
	}, []);
}
