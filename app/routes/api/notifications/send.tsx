import { and, eq } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { db } from "~/db";
import { membersTable } from "~/db/schema";
import {
	auditLog,
	getRequestIP,
	getRequestUserAgent,
} from "~/lib/audit-logger";
import { sendPushNotificationToUser } from "~/lib/notifications.server";
import { requireSession } from "~/lib/server/auth-helper";
import type { Route } from "./+types/send";

const sendNotificationSchema = z.object({
	userId: z.string(),
	organizationId: z.string().optional(),
	title: z.string(),
	body: z.string(),
	url: z.string().optional(),
	tag: z.string().optional(),
});

/**
 * Check if sender is authorized to send notifications to recipient
 * Authorization criteria (strict):
 * 1. If `organizationId` is provided, both users must be members of that org.
 * 2. If not provided, users must share exactly one org (unambiguous).
 * 3. TODO: Add follower relationship check if implemented
 * 4. TODO: Add allowlist check if implemented
 */
async function isAuthorizedToNotify(
	senderId: string,
	recipientId: string,
	organizationId?: string,
): Promise<{ authorized: boolean; reason?: string }> {
	if (organizationId) {
		const [senderMember, recipientMember] = await Promise.all([
			db.query.membersTable.findFirst({
				where: and(
					eq(membersTable.userId, senderId),
					eq(membersTable.organizationId, organizationId),
				),
			}),
			db.query.membersTable.findFirst({
				where: and(
					eq(membersTable.userId, recipientId),
					eq(membersTable.organizationId, organizationId),
				),
			}),
		]);

		if (!senderMember) {
			return {
				authorized: false,
				reason: "Sender is not a member of the specified organization",
			};
		}
		if (!recipientMember) {
			return {
				authorized: false,
				reason: "Recipient is not a member of the specified organization",
			};
		}

		return { authorized: true };
	}

	// Get sender's organizations
	const senderOrgs = await db
		.select({ organizationId: membersTable.organizationId })
		.from(membersTable)
		.where(eq(membersTable.userId, senderId));

	if (senderOrgs.length === 0) {
		return { authorized: false, reason: "Sender not in any organization" };
	}

	// Get recipient's organizations
	const recipientOrgs = await db
		.select({ organizationId: membersTable.organizationId })
		.from(membersTable)
		.where(eq(membersTable.userId, recipientId));

	if (recipientOrgs.length === 0) {
		return { authorized: false, reason: "Recipient not in any organization" };
	}

	// Find common organizations
	const senderOrgIds = new Set(senderOrgs.map((o) => o.organizationId));
	const commonOrgs = recipientOrgs.filter((o) =>
		senderOrgIds.has(o.organizationId),
	);

	// Require exactly one common organization to prevent ambiguous contexts
	if (commonOrgs.length === 1) {
		return { authorized: true };
	}

	if (commonOrgs.length === 0) {
		return {
			authorized: false,
			reason: "Sender and recipient do not share any organization",
		};
	}

	// Multiple shared orgs - ambiguous context, reject
	return {
		authorized: false,
		reason:
			"Users share multiple organizations; provide organizationId to disambiguate",
	};
}

// POST: Send a push notification to a specific user
export async function action({ request }: Route.ActionArgs) {
	const session = await requireSession(request, "notification.send");
	const user = session.user;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		auditLog({
			action: "notification.send",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid JSON in request body",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid JSON in request body" }, { status: 400 });
	}
	const result = sendNotificationSchema.safeParse(body);

	if (!result.success) {
		auditLog({
			action: "notification.send",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid notification data",
			metadata: { errors: result.error.issues },
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid notification data" }, { status: 400 });
	}

	const {
		userId,
		organizationId,
		title,
		body: notificationBody,
		url,
		tag,
	} = result.data;

	// Don't send notification to yourself
	if (userId === user.id) {
		auditLog({
			action: "notification.send",
			actorId: user.id,
			targetId: userId,
			outcome: "denied",
			reason: "Cannot send notification to self",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return { success: true, sent: 0, skipped: "self" };
	}

	// Authorization check
	const authCheck = await isAuthorizedToNotify(user.id, userId, organizationId);
	if (!authCheck.authorized) {
		auditLog({
			action: "notification.send",
			actorId: user.id,
			targetId: userId,
			outcome: "denied",
			reason: authCheck.reason || "Not authorized",
			metadata: {
				title,
				bodyLength: notificationBody.length,
				organizationId,
			},
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data(
			{
				error: "Forbidden",
				message: "You are not authorized to send notifications to this user",
			},
			{ status: 403 },
		);
	}

	try {
		const { sent, errors } = await sendPushNotificationToUser(userId, {
			title,
			body: notificationBody,
			url,
			tag,
		});

		// Audit log successful send
		auditLog({
			action: "notification.send",
			actorId: user.id,
			targetId: userId,
			outcome: "success",
			metadata: {
				title,
				sent,
				hasErrors: errors.length > 0,
			},
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		return {
			success: true,
			sent,
			errors:
				errors.length > 0 ? errors.map((e: unknown) => String(e)) : undefined,
		};
	} catch (error) {
		// Audit log error
		auditLog({
			action: "notification.send",
			actorId: user.id,
			targetId: userId,
			outcome: "error",
			reason: error instanceof Error ? error.message : "Unknown error",
			metadata: { title },
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		console.error("Failed to send push notification:", error);
		return data({ error: "Failed to send notification" }, { status: 500 });
	}
}
