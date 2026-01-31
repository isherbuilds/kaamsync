import { eq } from "drizzle-orm";
import { data } from "react-router";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { db } from "~/db";
import { pushSubscriptionsTable } from "~/db/schema/notifications";
import { requireSession } from "~/lib/auth/guard";
import { auditLog, getRequestIP, getRequestUserAgent } from "~/lib/infra/audit";
import { getVapidPublicKey } from "~/lib/notifications/service";
import type { Route } from "./+types/subscribe";

const subscriptionSchema = z.object({
	endpoint: z.url(),
	keys: z.object({
		p256dh: z.string(),
		auth: z.string(),
	}),
});

// GET: Return the VAPID public key for client-side subscription
export async function loader(_args: Route.LoaderArgs) {
	const vapidPublicKey = getVapidPublicKey();

	if (!vapidPublicKey) {
		return data(
			{ error: "Push notifications not configured" },
			{ status: 503 },
		);
	}

	return { vapidPublicKey };
}

// POST: Save a push subscription for the authenticated user
export async function action({ request }: Route.ActionArgs) {
	const session = await requireSession(request, "notification.subscribe");
	const user = session.user;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		auditLog({
			action: "notification.subscribe",
			actorId: user.id,
			outcome: "error",
			reason: "Malformed JSON body",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid JSON body" }, { status: 400 });
	}
	const result = subscriptionSchema.safeParse(body);

	if (!result.success) {
		auditLog({
			action: "notification.subscribe",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid subscription data",
			metadata: { errors: result.error.issues },
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid subscription data" }, { status: 400 });
	}

	const { endpoint, keys } = result.data;
	const userAgent = request.headers.get("user-agent") || undefined;

	// Check if subscription already exists (by endpoint)
	const existing = await db
		.select({
			id: pushSubscriptionsTable.id,
			userId: pushSubscriptionsTable.userId,
		})
		.from(pushSubscriptionsTable)
		.where(eq(pushSubscriptionsTable.endpoint, endpoint))
		.limit(1);

	if (existing.length > 0) {
		const existingRow = existing[0];

		// Only update if this subscription already belongs to the current user.
		if (existingRow.userId === user.id) {
			// Update existing subscription (refresh keys / metadata)
			await db
				.update(pushSubscriptionsTable)
				.set({
					p256dh: keys.p256dh,
					auth: keys.auth,
					userAgent,
					updatedAt: new Date(),
				})
				.where(eq(pushSubscriptionsTable.id, existingRow.id));

			// Audit log successful update
			auditLog({
				action: "notification.subscribe.update",
				actorId: user.id,
				outcome: "success",
				metadata: {
					subscriptionId: existingRow.id,
					endpoint: endpoint.substring(0, 50), // Truncate for privacy
				},
				ip: getRequestIP(request),
				userAgent: getRequestUserAgent(request),
			});

			return { success: true, updated: true };
		}

		// SECURITY: Subscription hijacking attempt detected
		// Do NOT transfer ownership silently - log and reject
		auditLog({
			action: "notification.subscribe.hijack_attempt",
			actorId: user.id,
			targetId: existingRow.userId,
			outcome: "denied",
			reason:
				"Attempted to register subscription endpoint owned by another user",
			metadata: {
				subscriptionId: existingRow.id,
				endpoint: endpoint.substring(0, 50), // Truncate for privacy
				actualOwner: existingRow.userId,
			},
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		return data(
			{ error: "Subscription endpoint is registered to another user" },
			{ status: 403 },
		);
	}

	// Create new subscription (guard for races on unique endpoint)
	const newSubscriptionId = uuid();
	try {
		await db.insert(pushSubscriptionsTable).values({
			id: newSubscriptionId,
			userId: user.id,
			endpoint,
			p256dh: keys.p256dh,
			auth: keys.auth,
			userAgent,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Audit log successful creation
		auditLog({
			action: "notification.subscribe.create",
			actorId: user.id,
			outcome: "success",
			metadata: {
				subscriptionId: newSubscriptionId,
				endpoint: endpoint.substring(0, 50), // Truncate for privacy
			},
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		return { success: true, created: true };
	} catch (err) {
		// Handle unique-constraint races by inspecting the existing row
		if (err instanceof Error && err.message.includes("unique constraint")) {
			const existingAfterConflict = await db
				.select({
					id: pushSubscriptionsTable.id,
					userId: pushSubscriptionsTable.userId,
				})
				.from(pushSubscriptionsTable)
				.where(eq(pushSubscriptionsTable.endpoint, endpoint))
				.limit(1);

			if (existingAfterConflict.length > 0) {
				const existingRow = existingAfterConflict[0];

				// If the subscription belongs to the same user, update it
				if (existingRow.userId === user.id) {
					await db
						.update(pushSubscriptionsTable)
						.set({
							p256dh: keys.p256dh,
							auth: keys.auth,
							userAgent,
							updatedAt: new Date(),
						})
						.where(eq(pushSubscriptionsTable.id, existingRow.id));

					// Audit log successful update
					auditLog({
						action: "notification.subscribe.update",
						actorId: user.id,
						outcome: "success",
						metadata: {
							subscriptionId: existingRow.id,
							endpoint: endpoint.substring(0, 50), // Truncate for privacy
						},
						ip: getRequestIP(request),
						userAgent: getRequestUserAgent(request),
					});

					return { success: true, updated: true };
				}

				// SECURITY: Subscription hijacking attempt detected
				auditLog({
					action: "notification.subscribe.hijack_attempt",
					actorId: user.id,
					targetId: existingRow.userId,
					outcome: "denied",
					reason:
						"Attempted to register subscription endpoint owned by another user",
					metadata: {
						subscriptionId: existingRow.id,
						endpoint: endpoint.substring(0, 50), // Truncate for privacy
						actualOwner: existingRow.userId,
					},
					ip: getRequestIP(request),
					userAgent: getRequestUserAgent(request),
				});

				return data(
					{ error: "Subscription endpoint is registered to another user" },
					{ status: 403 },
				);
			}
		}

		// If we didn't handle it, rethrow
		throw err;
	}
}
