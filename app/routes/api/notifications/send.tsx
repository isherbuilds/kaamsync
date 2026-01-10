import { data } from "react-router";
import { z } from "zod";
import { getServerSession } from "~/lib/auth";
import { sendPushNotificationToUser } from "~/lib/notifications.server";
import type { Route } from "./+types/send";

const sendNotificationSchema = z.object({
	userId: z.string(),
	title: z.string(),
	body: z.string(),
	url: z.string().optional(),
	tag: z.string().optional(),
});

// POST: Send a push notification to a specific user
export async function action({ request }: Route.ActionArgs) {
	const session = await getServerSession(request);

	// Only authenticated users can trigger notifications
	if (!session?.user) {
		return data({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json();
	const result = sendNotificationSchema.safeParse(body);

	if (!result.success) {
		return data({ error: "Invalid notification data" }, { status: 400 });
	}

	const { userId, title, body: notificationBody, url, tag } = result.data;

	// Don't send notification to yourself
	if (userId === session.user.id) {
		return { success: true, sent: 0, skipped: "self" };
	}

	try {
		const { sent, errors } = await sendPushNotificationToUser(userId, {
			title,
			body: notificationBody,
			url,
			tag,
		});

		return {
			success: true,
			sent,
			errors: errors.length > 0 ? errors.map((e) => String(e)) : undefined,
		};
	} catch (error) {
		console.error("Failed to send push notification:", error);
		return data({ error: "Failed to send notification" }, { status: 500 });
	}
}
