/**
 * Attachments API - Presigned URL endpoint for direct uploads
 * Following zbugs pattern: client gets presigned URL, uploads directly to S3
 */
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { z } from "zod";
import { getServerSession } from "~/lib/auth/server";
import {
	canUploadFile,
	createPresignedUpload,
	deleteAttachment,
	getOrganizationStorageLimits,
	getOrganizationStorageUsage,
	isStorageConfigured,
	saveAttachment,
	validateFileType,
} from "~/lib/storage/service";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const presignedUrlSchema = z.object({
	contentType: z.string().min(1),
	fileSize: z
		.number()
		.int()
		.positive()
		.max(100 * 1024 * 1024), // 100MB absolute max
	fileName: z.string().min(1).max(255),
});

const saveAttachmentSchema = z.object({
	matterId: z.string().min(1),
	storageKey: z.string().min(1),
	fileName: z.string().min(1).max(500),
	fileType: z.string().min(1).max(100),
	fileSize: z.number().int().positive(),
});

const deleteAttachmentSchema = z.object({
	attachmentId: z.string().min(1),
});

// =============================================================================
// GET - Storage status and permissions
// =============================================================================

export async function loader({ request }: LoaderFunctionArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId) {
		throw data({ error: "Unauthorized" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;

	if (!isStorageConfigured) {
		return data({
			configured: false,
			message: "Storage not configured",
		});
	}

	const [usage, limits] = await Promise.all([
		getOrganizationStorageUsage(orgId),
		getOrganizationStorageLimits(orgId),
	]);

	return data({
		configured: true,
		plan: limits.plan,
		usage: {
			totalBytes: usage.totalBytes,
			totalGb: Math.round(usage.totalGb * 100) / 100,
		},
		limits: {
			storageGb: limits.storageGb,
			maxFileSizeMb: limits.maxFileSizeMb,
			maxFiles: limits.maxFiles,
			remainingGb:
				limits.storageGb === -1
					? -1
					: Math.round((limits.storageGb - usage.totalGb) * 100) / 100,
		},
	});
}

// =============================================================================
// POST - Actions: presigned-url, save, delete
// =============================================================================

export async function action({ request }: ActionFunctionArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId || !session?.user?.id) {
		throw data({ error: "Unauthorized" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;
	const userId = session.user.id;

	if (!isStorageConfigured) {
		throw data({ error: "Storage not configured" }, { status: 503 });
	}

	// Parse JSON body with error handling
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw data({ error: "Invalid JSON body" }, { status: 400 });
	}

	const actionType = body._action as string;

	switch (actionType) {
		case "presigned-url": {
			const parsed = presignedUrlSchema.safeParse(body);
			if (!parsed.success) {
				throw data(
					{ error: "Invalid request", details: parsed.error },
					{ status: 400 },
				);
			}

			const { contentType, fileSize, fileName } = parsed.data;

			// Validate file type
			const validation = validateFileType(contentType);
			if (!validation.valid) {
				throw data({ error: validation.error }, { status: 400 });
			}

			// Check all permissions (size limit per plan, file count, total storage)
			const permission = await canUploadFile(orgId, fileSize);
			if (!permission.allowed) {
				throw data({ error: permission.reason }, { status: 403 });
			}

			// Generate presigned URL
			const result = await createPresignedUpload(
				orgId,
				contentType,
				fileSize,
				fileName,
			);

			return data({
				uploadUrl: result.uploadUrl,
				fileKey: result.fileKey,
				publicUrl: result.publicUrl,
			});
		}

		case "save": {
			const parsed = saveAttachmentSchema.safeParse(body);
			if (!parsed.success) {
				throw data(
					{ error: "Invalid request", details: parsed.error },
					{ status: 400 },
				);
			}

			try {
				const attachment = await saveAttachment({
					...parsed.data,
					uploaderId: userId,
					orgId,
				});
				return data({ id: attachment.id });
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to save attachment";
				throw data({ error: message }, { status: 403 });
			}
		}

		case "delete": {
			const parsed = deleteAttachmentSchema.safeParse(body);
			if (!parsed.success) {
				throw data(
					{ error: "Invalid request", details: parsed.error },
					{ status: 400 },
				);
			}

			try {
				await deleteAttachment(parsed.data.attachmentId, orgId, userId);

				return data({ success: true });
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "Failed to delete attachment";
				throw data({ error: message }, { status: 403 });
			}
		}

		default:
			throw data({ error: "Unknown action" }, { status: 400 });
	}
}
