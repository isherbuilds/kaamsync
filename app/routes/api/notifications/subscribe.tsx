import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { db } from "~/db";
import { pushSubscriptionsTable } from "~/db/schema";
import { getServerSession } from "~/lib/auth";
import { getVapidPublicKey } from "~/lib/notifications.server";
import type { Route } from "./+types/subscribe";

const subscriptionSchema = z.object({
	endpoint: z.url(),
	keys: z.object({
		p256dh: z.string(),
		auth: z.string(),
	}),
});

// GET: Return the VAPID public key for client-side subscription
export async function loader({ request }: Route.LoaderArgs) {
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
	const session = await getServerSession(request);

	if (!session?.user?.id) {
		return data({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const result = subscriptionSchema.safeParse(body);

	if (!result.success) {
		return data({ error: "Invalid subscription data" }, { status: 400 });
	}

	const { endpoint, keys } = result.data;
	const userAgent = request.headers.get("user-agent") || undefined;

	// Check if subscription already exists (by endpoint)
	const existing = await db
		.select({ id: pushSubscriptionsTable.id })
		.from(pushSubscriptionsTable)
		.where(eq(pushSubscriptionsTable.endpoint, endpoint))
		.limit(1);

	if (existing.length > 0) {
		// Update existing subscription (might be a different user or refreshed keys)
		await db
			.update(pushSubscriptionsTable)
			.set({
				userId: session.user.id,
				p256dh: keys.p256dh,
				auth: keys.auth,
				userAgent,
				updatedAt: new Date(),
			})
			.where(eq(pushSubscriptionsTable.id, existing[0].id));

		return { success: true, updated: true };
	}

	// Create new subscription
	await db.insert(pushSubscriptionsTable).values({
		id: createId(),
		userId: session.user.id,
		endpoint,
		p256dh: keys.p256dh,
		auth: keys.auth,
		userAgent,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	return { success: true, created: true };
}
