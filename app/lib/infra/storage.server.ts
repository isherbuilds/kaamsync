import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { and, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import {
	attachmentsTable,
	mattersTable,
	storageUsageCacheTable,
	teamMembershipsTable,
} from "~/db/schema";
import {
	canModifyAttachment,
	PERMISSION_ERRORS,
	type TeamRole,
} from "~/lib/auth/permissions";
import { getOrganizationPlanKey } from "~/lib/billing/billing.server";
import { type ProductKey, planLimits } from "~/lib/billing/plans";
import { uploadCache } from "~/lib/cache/upload-cache.server";
import {
	ABSOLUTE_MAX_FILE_SIZE,
	ALLOWED_ATTACHMENT_TYPES_SET,
} from "~/lib/constants/attachment";
import { logger } from "~/lib/logging/logger";
import { reportStorageUsage } from "../billing/tracking.server";
import { env } from "../config/env-validation.server";

// =============================================================================
// CONFIGURATION
// =============================================================================

const BUCKET_NAME = env.S3_BUCKET_NAME || "kaamsync";
const S3_REGION = env.S3_REGION || "auto";
const S3_ENDPOINT = env.S3_ENDPOINT; // For R2 or custom S3
const S3_PUBLIC_URL = env.S3_PUBLIC_URL; // Public URL for downloads

// Initialize S3 client (works with AWS S3, Cloudflare R2, MinIO, etc.)
const s3 =
	env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
		? new S3Client({
				region: S3_REGION,
				endpoint: S3_ENDPOINT,
				credentials: {
					accessKeyId: env.S3_ACCESS_KEY_ID,
					secretAccessKey: env.S3_SECRET_ACCESS_KEY,
				},
				forcePathStyle: !!S3_ENDPOINT, // Required for R2/MinIO
			})
		: null;

export const isStorageConfigured = !!s3;

// =============================================================================
// TYPES
// =============================================================================

export interface StorageUsage {
	totalBytes: number;
	totalGb: number;
	fileCount: number;
}

export interface StorageLimits {
	storageGb: number;
	maxFileSizeMb: number;
	maxFiles: number;
	plan: ProductKey;
}

export interface UploadPermission {
	allowed: boolean;
	reason?: string;
	currentUsageGb: number;
	limitGb: number;
	remainingGb: number;
	maxFileSizeBytes: number;
	fileCount: number;
	maxFiles: number;
}

export interface PresignedUploadResult {
	uploadUrl: string;
	fileKey: string;
	publicUrl: string;
}

// Use shared constants
const ALLOWED_TYPES = ALLOWED_ATTACHMENT_TYPES_SET;

// =============================================================================
// STORAGE USAGE QUERIES
// =============================================================================

/**
 * Get total storage used by an organization (in bytes)
 * Uses in-memory cache for speed, falls back to DB cache table
 */
export async function getOrganizationStorageUsage(
	orgId: string,
): Promise<StorageUsage> {
	const memCached = uploadCache.getStorageUsage(orgId);
	if (memCached) {
		return memCached;
	}

	const cached = await db.query.storageUsageCacheTable.findFirst({
		where: eq(storageUsageCacheTable.orgId, orgId),
	});

	if (cached) {
		const result = {
			totalBytes: cached.totalBytes,
			totalGb: cached.totalBytes / (1024 * 1024 * 1024),
			fileCount: cached.fileCount,
		};
		uploadCache.setStorageUsage(orgId, result);
		return result;
	}

	const result = await db
		.select({
			totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
			fileCount: sql<number>`COUNT(*)::int`,
		})
		.from(attachmentsTable)
		.where(eq(attachmentsTable.orgId, orgId));

	const totalBytes = result[0]?.totalBytes ?? 0;
	const fileCount = result[0]?.fileCount ?? 0;

	await db
		.insert(storageUsageCacheTable)
		.values({
			orgId,
			totalBytes,
			fileCount,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: storageUsageCacheTable.orgId,
			set: {
				totalBytes,
				fileCount,
				updatedAt: new Date(),
			},
		});

	const usageResult = {
		totalBytes,
		totalGb: totalBytes / (1024 * 1024 * 1024),
		fileCount,
	};
	uploadCache.setStorageUsage(orgId, usageResult);
	return usageResult;
}

/**
 * Update storage usage cache (call after upload/delete)
 */
export async function updateStorageUsageCache(
	orgId: string,
	bytesChange: number,
	countChange: number,
) {
	await db
		.insert(storageUsageCacheTable)
		.values({
			orgId,
			totalBytes: 0,
			fileCount: 0,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: storageUsageCacheTable.orgId,
			set: {
				totalBytes: sql`GREATEST(0, ${storageUsageCacheTable.totalBytes} + ${bytesChange})`,
				fileCount: sql`GREATEST(0, ${storageUsageCacheTable.fileCount} + ${countChange})`,
				updatedAt: new Date(),
			},
		});

	uploadCache.invalidateOrg(orgId);
}

/**
 * Get all storage limits for organization based on plan
 * Uses in-memory cache to avoid repeated plan lookups
 */
export async function getOrganizationStorageLimits(
	orgId: string,
): Promise<StorageLimits> {
	const cached = uploadCache.getStorageLimits(orgId);
	if (cached) {
		return cached.limits;
	}

	const plan = await getOrganizationPlanKey(orgId);
	const limits = planLimits[plan];
	const result = {
		storageGb: limits.storageGb,
		maxFileSizeMb: limits.maxFileSizeMb,
		maxFiles: limits.maxFiles,
		plan,
	};

	uploadCache.setStorageLimits(orgId, { limits, usage: null });
	return result;
}

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if organization can upload a file (checks all limits)
 */
export async function canUploadFile(
	orgId: string,
	fileSizeBytes: number,
): Promise<UploadPermission> {
	const [usage, limits] = await Promise.all([
		getOrganizationStorageUsage(orgId),
		getOrganizationStorageLimits(orgId),
	]);

	const maxFileSizeBytes = limits.maxFileSizeMb * 1024 * 1024;
	const basePermission = {
		currentUsageGb: usage.totalGb,
		limitGb: limits.storageGb,
		maxFileSizeBytes,
		fileCount: usage.fileCount,
		maxFiles: limits.maxFiles,
	};

	// Check file size limit per plan
	if (fileSizeBytes > maxFileSizeBytes) {
		return {
			...basePermission,
			allowed: false,
			reason: `File too large. Your plan allows up to ${limits.maxFileSizeMb}MB per file.`,
			remainingGb: Math.max(0, limits.storageGb - usage.totalGb),
		};
	}

	// Check file count limit (if not unlimited)
	if (limits.maxFiles !== -1 && usage.fileCount >= limits.maxFiles) {
		return {
			...basePermission,
			allowed: false,
			reason: `File limit (${limits.maxFiles} files) reached. Upgrade your plan or delete files.`,
			remainingGb: Math.max(0, limits.storageGb - usage.totalGb),
		};
	}

	// Unlimited storage (-1)
	if (limits.storageGb === -1) {
		return {
			...basePermission,
			allowed: true,
			remainingGb: -1,
		};
	}

	const newTotalGb = (usage.totalBytes + fileSizeBytes) / (1024 * 1024 * 1024);
	const remainingGb = Math.max(0, limits.storageGb - usage.totalGb);

	if (newTotalGb > limits.storageGb) {
		return {
			...basePermission,
			allowed: false,
			reason: `Storage limit (${limits.storageGb}GB) exceeded. Upgrade your plan or delete files.`,
			remainingGb,
		};
	}

	return {
		...basePermission,
		allowed: true,
		remainingGb,
	};
}

/**
 * Validate file type (size checked separately via canUploadFile)
 */
export function validateFileType(contentType: string): {
	valid: boolean;
	error?: string;
} {
	if (!ALLOWED_TYPES.has(contentType)) {
		return {
			valid: false,
			error: `File type "${contentType}" not allowed. Allowed: images, PDFs, documents, spreadsheets, text files, and archives.`,
		};
	}
	return { valid: true };
}

/**
 * Quick validation for absolute limits (before checking plan)
 */
export function validateFileBasic(
	contentType: string,
	fileSizeBytes: number,
): { valid: boolean; error?: string } {
	const typeCheck = validateFileType(contentType);
	if (!typeCheck.valid) return typeCheck;

	if (fileSizeBytes > ABSOLUTE_MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `File too large. Maximum size is ${ABSOLUTE_MAX_FILE_SIZE / (1024 * 1024)}MB.`,
		};
	}
	return { valid: true };
}

// =============================================================================
// UPLOAD (PRESIGNED URL)
// =============================================================================

export interface FileUploadRequest {
	contentType: string;
	fileSizeBytes: number;
	fileName: string;
}

export interface BatchPresignedUploadResult {
	files: Array<PresignedUploadResult & { originalRequest: FileUploadRequest }>;
	totalSize: number;
}

/**
 * Generate presigned URL for direct upload to S3
 * Client uploads directly to S3, then saves attachment record
 */
export async function createPresignedUpload(
	orgId: string,
	contentType: string,
	fileSizeBytes: number,
	fileName: string,
): Promise<PresignedUploadResult> {
	if (!s3) {
		throw new Error("Storage not configured");
	}

	const cached = uploadCache.getPresignedUrl(
		orgId,
		contentType,
		fileSizeBytes,
		fileName,
	);
	if (cached) {
		return cached;
	}

	const typeCheck = validateFileType(contentType);
	if (!typeCheck.valid) {
		throw new Error(typeCheck.error);
	}

	const permission = await canUploadFile(orgId, fileSizeBytes);
	if (!permission.allowed) {
		throw new Error(permission.reason);
	}

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const fileId = createId();
	const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
	const fileKey = `${orgId}/${year}/${month}/${fileId}-${safeFileName}`;

	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: fileKey,
		ContentType: contentType,
		ContentLength: fileSizeBytes,
	});

	const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
	const publicUrl = S3_PUBLIC_URL
		? `${S3_PUBLIC_URL}/${fileKey}`
		: `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;

	const result = { uploadUrl, fileKey, publicUrl };
	uploadCache.setPresignedUrl(
		orgId,
		contentType,
		fileSizeBytes,
		fileName,
		result,
	);

	return result;
}

/**
 * Generate multiple presigned URLs in parallel for batch uploads
 * Validates all files upfront and returns presigned URLs for all
 */
export async function createBatchPresignedUploads(
	orgId: string,
	requests: FileUploadRequest[],
): Promise<BatchPresignedUploadResult> {
	if (!s3) {
		throw new Error("Storage not configured");
	}

	const totalSize = requests.reduce((sum, r) => sum + r.fileSizeBytes, 0);

	const permission = await canUploadFile(orgId, totalSize);
	if (!permission.allowed) {
		throw new Error(permission.reason);
	}

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");

	const results = await Promise.all(
		requests.map(async (request) => {
			const cached = uploadCache.getPresignedUrl(
				orgId,
				request.contentType,
				request.fileSizeBytes,
				request.fileName,
			);

			if (cached) {
				return { ...cached, originalRequest: request };
			}

			const typeCheck = validateFileType(request.contentType);
			if (!typeCheck.valid) {
				throw new Error(typeCheck.error);
			}

			const fileId = createId();
			const safeFileName = request.fileName
				.replace(/[^a-zA-Z0-9.-]/g, "_")
				.slice(0, 100);
			const fileKey = `${orgId}/${year}/${month}/${fileId}-${safeFileName}`;

			const command = new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: fileKey,
				ContentType: request.contentType,
				ContentLength: request.fileSizeBytes,
			});

			const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
			const publicUrl = S3_PUBLIC_URL
				? `${S3_PUBLIC_URL}/${fileKey}`
				: `https://${BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${fileKey}`;

			const result = {
				uploadUrl,
				fileKey,
				publicUrl,
				originalRequest: request,
			};
			uploadCache.setPresignedUrl(
				orgId,
				request.contentType,
				request.fileSizeBytes,
				request.fileName,
				result,
			);

			return result;
		}),
	);

	return { files: results, totalSize };
}

// =============================================================================
// AUTHORIZATION HELPERS
// =============================================================================

/**
 * Check if user has access to a matter (is team member)
 */
async function assertUserCanAccessMatter(
	userId: string,
	matterId: string,
	orgId: string,
): Promise<{ matter: typeof mattersTable.$inferSelect }> {
	// Get the matter and verify it belongs to the org
	const matter = await db.query.mattersTable.findFirst({
		where: and(eq(mattersTable.id, matterId), eq(mattersTable.orgId, orgId)),
	});

	if (!matter) {
		throw new Error(PERMISSION_ERRORS.MATTER_NOT_FOUND);
	}

	// Verify user is a member of the team that owns this matter
	const membership = await db.query.teamMembershipsTable.findFirst({
		where: and(
			eq(teamMembershipsTable.teamId, matter.teamId),
			eq(teamMembershipsTable.userId, userId),
			eq(teamMembershipsTable.orgId, orgId),
		),
	});

	if (!membership || membership.deletedAt) {
		throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);
	}

	return { matter };
}

/**
 * Check if user can delete an attachment.
 * Uses shared permission logic: uploader, author, assignee, or manager can delete.
 */
async function assertUserCanDeleteAttachment(
	userId: string,
	attachmentId: string,
	orgId: string,
): Promise<{ attachment: typeof attachmentsTable.$inferSelect }> {
	// Get attachment with matter info
	const attachment = await db.query.attachmentsTable.findFirst({
		where: eq(attachmentsTable.id, attachmentId),
		with: { matter: true },
	});

	if (!attachment) {
		throw new Error(PERMISSION_ERRORS.ATTACHMENT_NOT_FOUND);
	}

	// Verify matter belongs to org
	if (attachment.matter.orgId !== orgId) {
		throw new Error(PERMISSION_ERRORS.ORGANIZATION_ACCESS_DENIED);
	}

	// Check team membership
	const membership = await db.query.teamMembershipsTable.findFirst({
		where: and(
			eq(teamMembershipsTable.teamId, attachment.matter.teamId),
			eq(teamMembershipsTable.userId, userId),
			eq(teamMembershipsTable.orgId, orgId),
		),
	});

	if (!membership || membership.deletedAt) {
		throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);
	}

	// Use shared permission logic: uploader, author, assignee, or manager
	const canDelete = canModifyAttachment(
		membership.role as TeamRole,
		attachment.uploaderId === userId,
		attachment.matter.authorId === userId,
		attachment.matter.assigneeId === userId,
	);

	if (!canDelete) {
		throw new Error(PERMISSION_ERRORS.ATTACHMENT_DELETE_DENIED);
	}

	return { attachment };
}

// =============================================================================
// ATTACHMENT RECORDS
// =============================================================================

/**
 * Save attachment record after successful upload
 * Verifies user has access to the matter before saving
 */
export async function saveAttachment(params: {
	matterId: string;
	uploaderId: string;
	storageKey: string;
	fileName: string;
	fileType: string;
	fileSize: number;
	orgId: string;
}): Promise<{ id: string }> {
	// Authorization: verify user can access this matter
	await assertUserCanAccessMatter(
		params.uploaderId,
		params.matterId,
		params.orgId,
	);

	// Re-check storage limits to prevent race conditions
	const permission = await canUploadFile(params.orgId, params.fileSize);
	if (!permission.allowed) {
		throw new Error(permission.reason || "Storage limit exceeded");
	}

	const id = createId();
	const now = new Date();
	await db.insert(attachmentsTable).values({
		id,
		orgId: params.orgId, // Direct org reference for fast queries
		matterId: params.matterId,
		uploaderId: params.uploaderId,
		storageKey: params.storageKey,
		fileName: params.fileName,
		fileType: params.fileType,
		fileSize: params.fileSize,
		createdAt: now,
		updatedAt: now,
	});

	// Update storage cache
	await updateStorageUsageCache(params.orgId, params.fileSize, 1);

	// Report storage increase to billing (fire and forget)
	reportStorageUsage(params.orgId).catch((err) =>
		logger.error("[Storage] Failed to report usage on save:", err),
	);

	return { id };
}

/**
 * Delete attachment and update storage tracking
 * Verifies user has permission to delete before proceeding
 */
export async function deleteAttachment(
	attachmentId: string,
	orgId: string,
	userId: string,
) {
	// Authorization: verify user can delete this attachment
	const { attachment } = await assertUserCanDeleteAttachment(
		userId,
		attachmentId,
		orgId,
	);

	// Delete from database (S3 lifecycle rules can clean up orphaned files)
	await db
		.delete(attachmentsTable)
		.where(eq(attachmentsTable.id, attachmentId));

	// Update storage cache (decrement)
	await updateStorageUsageCache(orgId, -attachment.fileSize, -1);

	// Delete from S3 (best effort - lifecycle rules handle orphans)
	try {
		await s3?.send(
			new DeleteObjectCommand({
				Bucket: BUCKET_NAME,
				Key: attachment.storageKey,
			}),
		);
	} catch (error) {
		logger.error(
			`[Storage] Failed to delete S3 object ${attachment.storageKey}:`,
			error,
		);
		// Continue - DB record is deleted, S3 lifecycle will clean up
	}

	logger.info(
		`[Storage] Deleted attachment ${attachmentId} (${attachment.fileName}) by user ${userId}`,
	);

	// Report storage decrease to billing (fire and forget)
	reportStorageUsage(orgId).catch((err) =>
		logger.error("[Storage] Failed to report usage on delete:", err),
	);
}

// Re-export from shared constants for backwards compatibility
export {
	ABSOLUTE_MAX_FILE_SIZE,
	ALLOWED_ATTACHMENT_TYPES_SET as ALLOWED_TYPES,
} from "~/lib/constants/attachment";
