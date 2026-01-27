import { useEffect } from "react";

/**
 * Hook to register the service worker for PWA functionality.
 *
 * Only registers in production builds. Handles offline caching,
 * push notifications, and background sync capabilities.
 *
 * @example
 * ```tsx
 * // Call once at the app root level
 * function AppLayout() {
 *   useServiceWorker();
 *   return <Outlet />;
 * }
 * ```
 */
export function useServiceWorker(): void {
	useEffect(() => {
		const isServer = typeof window === "undefined";
		const isDevelopment = import.meta.env.DEV;

		if (isServer || isDevelopment) return;

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.register("/service-worker.js").catch((error) => {
				console.error("Service worker registration failed:", error);
			});
		}
	}, []);
}
