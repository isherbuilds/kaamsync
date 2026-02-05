/**
 * Browser compatibility utilities for push notifications
 *
 * Push notifications require:
 * - Service Worker support
 * - Push API support
 * - Notification API support
 *
 * Browser Support:
 * ✅ Chrome 42+ (Desktop & Android)
 * ✅ Firefox 44+ (Desktop & Android)
 * ✅ Safari 16+ (macOS Ventura+, iOS 16.4+)
 * ✅ Edge 17+ (Desktop & Android)
 * ❌ Private/Incognito mode (most browsers)
 * ❌ iOS Safari below 16.4
 */

export interface BrowserInfo {
	name: string;
	version: string;
	isSupported: boolean;
	warnings: string[];
}

export function getBrowserInfo(): BrowserInfo {
	const ua = navigator.userAgent;
	const warnings: string[] = [];
	let name = "Unknown";
	let version = "Unknown";

	if (ua.includes("Chrome") && !ua.includes("Edg")) {
		name = "Chrome";
		const match = ua.match(/Chrome\/(\d+)/);
		version = match ? match[1] : "Unknown";
	} else if (ua.includes("Firefox")) {
		name = "Firefox";
		const match = ua.match(/Firefox\/(\d+)/);
		version = match ? match[1] : "Unknown";
	} else if (ua.includes("Safari") && !ua.includes("Chrome")) {
		name = "Safari";
		const match = ua.match(/Version\/(\d+)/);
		version = match ? match[1] : "Unknown";
	} else if (ua.includes("Edg")) {
		name = "Edge";
		const match = ua.match(/Edg\/(\d+)/);
		version = match ? match[1] : "Unknown";
	}

	const hasServiceWorker = "serviceWorker" in navigator;
	const hasPushManager = "PushManager" in window;
	const hasNotification = "Notification" in window;
	const isSupported = hasServiceWorker && hasPushManager && hasNotification;

	if (!isSupported) {
		if (!hasServiceWorker) warnings.push("Service Workers not supported");
		if (!hasPushManager) warnings.push("Push API not supported");
		if (!hasNotification) warnings.push("Notifications not supported");
	}

	if (name === "Safari" && Number.parseInt(version) < 16) {
		warnings.push(
			"Push notifications require Safari 16+ (macOS Ventura or iOS 16.4+)",
		);
	}

	if (name === "Chrome" && Number.parseInt(version) < 42) {
		warnings.push("Chrome 42+ required for push notifications");
	}

	if (name === "Firefox" && Number.parseInt(version) < 44) {
		warnings.push("Firefox 44+ required for push notifications");
	}

	try {
		localStorage.setItem("__test__", "test");
		localStorage.removeItem("__test__");
	} catch {
		warnings.push("Private/Incognito mode may prevent push notifications");
	}

	return { name, version, isSupported, warnings };
}

export function isPushSupported(): boolean {
	return (
		"serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
	);
}

export function getBrowserHelpUrl(): string | null {
	const ua = navigator.userAgent.toLowerCase();
	if (ua.includes("chrome"))
		return "https://support.google.com/chrome/answer/3220216";
	if (ua.includes("firefox"))
		return "https://support.mozilla.org/en-US/kb/push-notifications-firefox";
	if (ua.includes("safari"))
		return "https://support.apple.com/guide/safari/sfri40734";
	if (ua.includes("edg"))
		return "https://support.microsoft.com/en-us/microsoft-edge";
	return null;
}
