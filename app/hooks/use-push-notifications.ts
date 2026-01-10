import { useCallback, useEffect, useState } from "react";

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
			setPermission(Notification.permission);

			if (!supported) {
				setIsLoading(false);
				return;
			}

			try {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();
				setIsSubscribed(!!subscription);
			} catch (error) {
				console.error("Error checking push subscription:", error);
			} finally {
				setIsLoading(false);
			}
		};

		checkSupport();
	}, []);

	const subscribe = useCallback(async (): Promise<boolean> => {
		if (!isSupported) {
			console.warn("Push notifications not supported");
			return false;
		}

		setIsLoading(true);

		try {
			// Request notification permission
			const notificationPermission = await Notification.requestPermission();
			setPermission(notificationPermission);

			if (notificationPermission !== "granted") {
				console.warn("Notification permission denied");
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
			console.error("Error subscribing to push notifications:", error);
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
				await subscription.unsubscribe();
			}

			setIsSubscribed(false);
			return true;
		} catch (error) {
			console.error("Error unsubscribing from push notifications:", error);
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
		console.error("Error sending notification:", error);
		return false;
	}
}
