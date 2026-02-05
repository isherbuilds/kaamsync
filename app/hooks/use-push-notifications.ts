import { useCallback, useEffect, useState } from "react";
import { safeError, warn } from "~/lib/utils/logger";

const FETCH_TIMEOUT = 10000;

function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	label: string,
): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(`${label} timed out after ${ms}ms`)),
				ms,
			),
		),
	]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

export function usePushNotifications() {
	const [isSupported, setIsSupported] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");

	useEffect(() => {
		if (typeof window === "undefined") return;

		const checkSupport = async () => {
			const supported =
				"serviceWorker" in navigator &&
				"PushManager" in window &&
				"Notification" in window;

			setIsSupported(supported);
			if (supported) setPermission(Notification.permission);

			if (!supported) {
				setIsLoading(false);
				return;
			}

			try {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();
				setIsSubscribed(!!subscription);
			} catch (error) {
				safeError(error, "Error checking push subscription");
			} finally {
				setIsLoading(false);
			}
		};

		checkSupport();
	}, []);

	const subscribe = useCallback(async (): Promise<boolean> => {
		if (!isSupported) {
			warn("Push notifications not supported");
			return false;
		}

		setIsLoading(true);

		try {
			const notificationPermission = await Notification.requestPermission();
			setPermission(notificationPermission);

			if (notificationPermission !== "granted") {
				warn("Notification permission denied");
				return false;
			}

			const keyResponse = await withTimeout(
				fetch("/api/notifications/subscribe"),
				FETCH_TIMEOUT,
				"Fetch VAPID key",
			);

			if (!keyResponse.ok) {
				throw new Error("Failed to get VAPID key");
			}

			const { vapidPublicKey } = await keyResponse.json();
			if (!vapidPublicKey) {
				throw new Error("VAPID key not available");
			}

			const registration = await navigator.serviceWorker.ready;
			const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

			const subscription = await withTimeout(
				registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: applicationServerKey as BufferSource,
				}),
				FETCH_TIMEOUT,
				"Push manager subscribe",
			);

			const response = await withTimeout(
				fetch("/api/notifications/subscribe", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(subscription.toJSON()),
				}),
				FETCH_TIMEOUT,
				"Save subscription",
			);

			if (!response.ok) {
				throw new Error("Failed to save subscription");
			}

			setIsSubscribed(true);
			return true;
		} catch (error) {
			safeError(error, "Error subscribing to push notifications");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [isSupported]);

	const unsubscribe = useCallback(async (): Promise<boolean> => {
		if (!isSupported) return false;

		setIsLoading(true);

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();

			if (subscription) {
				const response = await withTimeout(
					fetch("/api/notifications/subscribe", {
						method: "DELETE",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(subscription.toJSON()),
					}),
					FETCH_TIMEOUT,
					"Delete subscription",
				);

				if (!response.ok) {
					throw new Error("Failed to delete subscription from server");
				}

				await subscription.unsubscribe();
			}

			setIsSubscribed(false);
			return true;
		} catch (error) {
			safeError(error, "Error unsubscribing from push notifications");
			return false;
		} finally {
			setIsLoading(false);
		}
	}, [isSupported]);

	return {
		isSupported,
		isSubscribed,
		isLoading,
		permission,
		subscribe,
		unsubscribe,
	};
}

export async function sendNotificationToUser(
	userId: string,
	title: string,
	body: string,
	url?: string,
): Promise<boolean> {
	try {
		const response = await fetch("/api/notifications/send", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, title, body, url }),
		});

		return response.ok;
	} catch (error) {
		safeError(error, "Error sending notification");
		return false;
	}
}
