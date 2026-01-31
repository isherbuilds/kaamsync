import { count, eq, sql, sum } from "drizzle-orm";
import { data } from "react-router";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { getEffectiveStorageLimit, planLimits } from "~/config/billing";
import { db } from "~/db";
import { attachmentsTable, storageUsageCacheTable } from "~/db/schema/storage";
import { requireSession } from "~/lib/auth/guard";
import {
	clearUsageCache,
	fetchOrgSubscription,
	fetchOrgUsage,
} from "~/lib/billing/service";
import { auditLog, getRequestIP, getRequestUserAgent } from "~/lib/infra/audit";
import {
	buildPublicUrl,
	buildStorageKey,
	getPresignedUploadUrl,
} from "~/lib/infra/storage";
import type { Route } from "./+types/presign";

// Allowed MIME types for file uploads
const ALLOWED_CONTENT_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	// Documents
	"application/pdf",
	"text/plain",
	"text/markdown",
	// Microsoft Office
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	// OpenDocument
	"application/vnd.oasis.opendocument.text",
	"application/vnd.oasis.opendocument.spreadsheet",
	"application/vnd.oasis.opendocument.presentation",
	// Archives (for bulk uploads)
	"application/zip",
	"application/x-zip-compressed",
];

// Dangerous file extensions that should be blocked
const BLOCKED_EXTENSIONS = [
	".exe",
	".dll",
	".bat",
	".cmd",
	".sh",
	".php",
	".jsp",
	".asp",
	".aspx",
	".html",
	".htm",
	".js",
	".jar",
	".app",
	".dmg",
	".pkg",
	".deb",
	".rpm",
];

function isValidFileType(contentType: string, fileName: string): boolean {
	// Check content type against allowed list
	const isAllowedType = ALLOWED_CONTENT_TYPES.some(
		(type) =>
			contentType === type ||
			(type.endsWith("/*") && contentType.startsWith(type.replace("/*", "/"))),
	);

	if (!isAllowedType) return false;

	// Check file extension against blocked list
	const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
	if (BLOCKED_EXTENSIONS.includes(extension)) return false;

	return true;
}

const presignSchema = z.object({
	contentType: z.string().min(1, "Content type is required"),
	fileName: z.string().min(1, "File name is required"),
	fileSize: z.number().int().positive("File size is required"),
});

export async function action({ request }: Route.ActionArgs) {
	const session = await requireSession(request, "attachment.presign");
	const user = session.user;
	const orgId = session.session.activeOrganizationId;

	if (!orgId) {
		return data({ error: "No active organization" }, { status: 400 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		auditLog({
			action: "attachment.presign",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid JSON body",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid JSON body" }, { status: 400 });
	}

	const result = presignSchema.safeParse(payload);
	if (!result.success) {
		auditLog({
			action: "attachment.presign",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid payload",
			metadata: { errors: result.error.issues },
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Invalid upload request" }, { status: 400 });
	}

	const { contentType, fileName, fileSize } = result.data;

	// Validate file type (security check)
	if (!isValidFileType(contentType, fileName)) {
		auditLog({
			action: "attachment.presign",
			actorId: user.id,
			outcome: "error",
			reason: "Invalid file type",
			metadata: { contentType, fileName },
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "File type not allowed" }, { status: 415 });
	}

	try {
		const [subscription, usage] = await Promise.all([
			fetchOrgSubscription(orgId),
			fetchOrgUsage(orgId),
		]);
		const planKey = (subscription?.plan ??
			"starter") as keyof typeof planLimits;
		const planLimit = planLimits[planKey];
		const maxFileSizeBytes = planLimit.maxFileSizeMb * 1024 * 1024;
		const storageLimitGb = getEffectiveStorageLimit(
			planKey,
			subscription?.purchasedStorageGB ?? 0,
		);
		const maxFiles = planLimit.maxFiles;

		if (maxFileSizeBytes > 0 && fileSize > maxFileSizeBytes) {
			return data({ error: "File exceeds plan limit" }, { status: 413 });
		}

		// Create attachment record first (optimistic approach to prevent race conditions)
		const attachmentId = uuid();
		const storageKey = buildStorageKey(orgId, attachmentId, fileName);
		const uploadUrl = await getPresignedUploadUrl(storageKey, contentType);
		const publicUrl = buildPublicUrl(storageKey);

		await db.insert(attachmentsTable).values({
			id: attachmentId,
			orgId,
			subjectId: orgId,
			subjectType: "draft",
			uploaderId: user.id,
			storageKey,
			publicUrl,
			fileName,
			fileType: contentType,
			fileSize,
			created: Date.now(),
		});

		// Verify storage limit wasn't exceeded (check after insert to prevent race conditions)
		if (storageLimitGb !== -1) {
			const limitBytes = storageLimitGb * 1024 * 1024 * 1024;
			// Use actual DB sum for accurate count, not cached usage
			const [storageResult] = await db
				.select({ totalBytes: sum(attachmentsTable.fileSize) })
				.from(attachmentsTable)
				.where(eq(attachmentsTable.orgId, orgId));
			const currentBytes = Number(storageResult?.totalBytes ?? 0);

			if (currentBytes > limitBytes) {
				// Rollback: delete the record we just created
				await db
					.delete(attachmentsTable)
					.where(eq(attachmentsTable.id, attachmentId));
				return data({ error: "Storage limit reached" }, { status: 413 });
			}
		}

		// Verify file count limit wasn't exceeded (check after insert)
		if (maxFiles !== -1) {
			const [{ total = 0 } = {}] = await db
				.select({ total: count() })
				.from(attachmentsTable)
				.where(eq(attachmentsTable.orgId, orgId));
			if (total > maxFiles) {
				// Rollback: delete the record we just created
				await db
					.delete(attachmentsTable)
					.where(eq(attachmentsTable.id, attachmentId));
				return data({ error: "Attachment limit reached" }, { status: 413 });
			}
		}

		await db
			.insert(storageUsageCacheTable)
			.values({
				orgId,
				totalBytes: fileSize,
				fileCount: 1,
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: storageUsageCacheTable.orgId,
				set: {
					totalBytes: sql`${storageUsageCacheTable.totalBytes} + ${fileSize}`,
					fileCount: sql`${storageUsageCacheTable.fileCount} + 1`,
					updatedAt: new Date(),
				},
			});

		clearUsageCache(orgId, "storage");

		return {
			uploadUrl,
			storageKey,
			publicUrl,
			attachmentId,
		};
	} catch (error) {
		auditLog({
			action: "attachment.presign",
			actorId: user.id,
			outcome: "error",
			reason: error instanceof Error ? error.message : "Unknown error",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});
		return data({ error: "Failed to prepare upload" }, { status: 500 });
	}
}
