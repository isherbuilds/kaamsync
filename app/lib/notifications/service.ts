import { and, eq, isNull } from "drizzle-orm";
import webpush from "web-push";
import { db } from "~/db";
import { pushSubscriptionsTable } from "~/db/schema/notifications";

// Type for web-push errors
interface WebPushError extends Error {
	statusCode?: number;
}

// Configure web-push with VAPID keys from environment
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@kaamsync.com";

if (vapidPublicKey && vapidPrivateKey) {
	webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface NotificationPayload {
	title: string;
	body: string;
	url?: string;
	tag?: string;
}

/**
 * Send a push notification to a specific user
 * @param userId - The user ID to send the notification to
 * @param payload - The notification content
 * @returns Object with success count and errors
 */
export async function sendPushNotificationToUser(
	userId: string,
	payload: NotificationPayload,
) {
	if (!vapidPublicKey || !vapidPrivateKey) {
		console.warn("VAPID keys not configured. Skipping push notification.");
		return { sent: 0, errors: [] };
	}

	// Get all non-deleted subscriptions for this user
	// Subscriptions with `deleted_at` set should not receive notifications.
	type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;
	const subscriptions: PushSubscriptionRow[] = await db
		.select()
		.from(pushSubscriptionsTable)
		.where(
			and(
				eq(pushSubscriptionsTable.userId, userId),
				isNull(pushSubscriptionsTable.deletedAt),
			),
		);

	if (subscriptions.length === 0) {
		return { sent: 0, errors: [] };
	}

	const results: PromiseSettledResult<{
		success: true;
		endpoint: string;
	}>[] = await Promise.allSettled(
		subscriptions.map(async (sub) => {
			const pushSubscription = {
				endpoint: sub.endpoint,
				keys: {
					p256dh: sub.p256dh,
					auth: sub.auth,
				},
			};

			try {
				await webpush.sendNotification(
					pushSubscription,
					JSON.stringify(payload),
				);
				return { success: true, endpoint: sub.endpoint };
			} catch (error) {
				// If subscription is expired/invalid (410 Gone), remove it
				const webPushError = error as WebPushError;
				if (webPushError.statusCode === 410) {
					await db
						.delete(pushSubscriptionsTable)
						.where(eq(pushSubscriptionsTable.id, sub.id));
				}
				throw error;
			}
		}),
	);

	const sent = results.filter((r) => r.status === "fulfilled").length;
	const errors = results
		.filter((r): r is PromiseRejectedResult => r.status === "rejected")
		.map((r) => r.reason);

	return { sent, errors };
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
	return vapidPublicKey || null;
}
