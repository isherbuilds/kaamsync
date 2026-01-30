import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, sql } from "drizzle-orm";
import { data } from "react-router";
import { z } from "zod";
import { db } from "~/db";
import { attachmentsTable, storageUsageCacheTable } from "~/db/schema/storage";
import { requireSession } from "~/lib/auth/guard";
import { clearUsageCache } from "~/lib/billing/service";
import { auditLog, getRequestIP, getRequestUserAgent } from "~/lib/infra/audit";
import { env } from "~/lib/infra/env";
import { getStorageClient } from "~/lib/infra/storage";
import type { Route } from "./+types/cleanup";

const cleanupSchema = z.object({
	attachmentIds: z.array(z.string().min(1)).min(1),
});

export async function action({ request }: Route.ActionArgs) {
	const session = await requireSession(request, "attachment.cleanup");
	const user = session.user;
	const orgId = session.session.activeOrganizationId;

	if (!orgId) {
		return data({ error: "No active organization" }, { status: 400 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return data({ error: "Invalid JSON body" }, { status: 400 });
	}

	const result = cleanupSchema.safeParse(payload);
	if (!result.success) {
		return data({ error: "Invalid request" }, { status: 400 });
	}

	const { attachmentIds } = result.data;

	try {
		const attachments = await db
			.select({
				id: attachmentsTable.id,
				orgId: attachmentsTable.orgId,
				subjectType: attachmentsTable.subjectType,
				uploaderId: attachmentsTable.uploaderId,
				storageKey: attachmentsTable.storageKey,
				fileSize: attachmentsTable.fileSize,
			})
			.from(attachmentsTable)
			.where(eq(attachmentsTable.orgId, orgId));

		const deletableAttachments = attachments.filter(
			(a) =>
				attachmentIds.includes(a.id) &&
				a.subjectType === "draft" &&
				a.uploaderId === user.id,
		);

		if (deletableAttachments.length === 0) {
			return data({ error: "No attachments to clean up" }, { status: 404 });
		}

		const totalBytesToRemove = deletableAttachments.reduce(
			(acc, a) => acc + (a.fileSize ?? 0),
			0,
		);

		// Delete from S3 first
		for (const attachment of deletableAttachments) {
			if (attachment.storageKey) {
				try {
					const client = getStorageClient();
					await client.send(
						new DeleteObjectCommand({
							Bucket: env.STORAGE_BUCKET_NAME,
							Key: attachment.storageKey,
						}),
					);
				} catch (s3Error) {
					console.error(
						`Failed to delete S3 object ${attachment.storageKey}:`,
						s3Error,
					);
				}
			}
		}

		const idsToDelete = deletableAttachments.map((a) => a.id);
		await db
			.delete(attachmentsTable)
			.where(
				and(
					eq(attachmentsTable.orgId, orgId),
					eq(attachmentsTable.subjectType, "draft"),
				),
			);

		await db
			.update(storageUsageCacheTable)
			.set({
				totalBytes: sql`GREATEST(0, ${storageUsageCacheTable.totalBytes} - ${totalBytesToRemove})`,
				fileCount: sql`GREATEST(0, ${storageUsageCacheTable.fileCount} - ${deletableAttachments.length})`,
				updatedAt: new Date(),
			})
			.where(eq(storageUsageCacheTable.orgId, orgId));

		clearUsageCache(orgId, "storage");

		auditLog({
			action: "attachment.cleanup",
			actorId: user.id,
			outcome: "success",
			metadata: {
				deletedCount: idsToDelete.length,
				attachmentIds: idsToDelete,
				bytesRemoved: totalBytesToRemove,
			},
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		return data({
			success: true,
			deletedCount: idsToDelete.length,
		});
	} catch (error) {
		auditLog({
			action: "attachment.cleanup",
			actorId: user.id,
			outcome: "error",
			reason: error instanceof Error ? error.message : "Unknown error",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Failed to clean up attachments" }, { status: 500 });
	}
}
