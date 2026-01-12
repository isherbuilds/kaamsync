import { useCallback, useEffect, useState } from "react";
import { safeError, warn } from "~/lib/logger";

export function usePushNotifications() {
	const [isSupported, setIsSupported] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");

	// Check support and current subscription status on mount
	useEffect(() => {
		if (typeof window === "undefined") return;

		const checkSupport = async () => {
			const supported =
				"serviceWorker" in navigator &&
				"PushManager" in window &&
				"Notification" in window;

			setIsSupported(supported);
			if (supported) {
				setPermission(Notification.permission);
			}

			if (!supported) {
				return;
			}

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
			// Request notification permission
			const notificationPermission = await Notification.requestPermission();
			setPermission(notificationPermission);

			if (notificationPermission !== "granted") {
				warn("Notification permission denied");
				setIsLoading(false);
				return false;
			}

			// Get VAPID public key from server
			const keyResponse = await fetch("/api/notifications/subscribe");
			if (!keyResponse.ok) {
				throw new Error("Failed to get VAPID key");
			}
			const { vapidPublicKey } = await keyResponse.json();

			if (!vapidPublicKey) {
				throw new Error("VAPID key not available");
			}

			// Subscribe to push notifications
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: vapidPublicKey,
			});

			// Send subscription to server
			const response = await fetch("/api/notifications/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(subscription.toJSON()),
			});

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
				// Notify server before unsubscribing
				await fetch("/api/notifications/subscribe", {
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(subscription.toJSON()),
				});

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

/**
 * Helper function to send a notification to a user (call from client after mutation)
 */
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
