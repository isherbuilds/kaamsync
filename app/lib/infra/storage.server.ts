import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
import {
	ABSOLUTE_MAX_FILE_SIZE,
	isAllowedAttachmentType,
} from "~/lib/constants/attachment";
import { logger } from "~/lib/logging/logger";

const _BUCKET_NAME = process.env.S3_BUCKET_NAME || "kaamsync";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const _S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

const s3 =
	process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
		? new S3Client({
				region: S3_REGION,
				endpoint: S3_ENDPOINT,
				credentials: {
					accessKeyId: process.env.S3_ACCESS_KEY_ID,
					secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
				},
				forcePathStyle: !!S3_ENDPOINT,
			})
		: null;

export const isStorageConfigured = !!s3;

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
	currentUsageGb?: number;
	limitGb?: number;
	remainingGb?: number;
	maxFileSizeBytes?: number;
	maxFiles?: number;
	fileCount?: number;
}

export interface PresignedUploadResult {
	uploadUrl: string;
	fileKey: string;
	publicUrl: string;
}

export interface FileUploadRequest {
	contentType: string;
	fileSizeBytes: number;
	fileName: string;
}

export interface BatchPresignedUploadResult {
	files: Array<PresignedUploadResult & { originalRequest: FileUploadRequest }>;
	totalSize: number;
}

export function validateFileType(contentType: string): {
	valid: boolean;
	error?: string;
} {
	if (!isAllowedAttachmentType(contentType)) {
		return {
			valid: false,
			error: `File type '${contentType}' is not supported`,
		};
	}
	return { valid: true };
}

export async function getOrganizationStorageUsage(
	orgId: string,
): Promise<StorageUsage> {
	const cached = await db.query.storageUsageCacheTable.findFirst({
		where: eq(storageUsageCacheTable.orgId, orgId),
	});

	if (cached) {
		return {
			totalBytes: Number(cached.totalBytes),
			totalGb: Number(cached.totalBytes) / (1024 * 1024 * 1024),
			fileCount: cached.fileCount,
		};
	}

	const result = await db
		.select({
			totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
			fileCount: sql<number>`COUNT(*)::int`,
		})
		.from(attachmentsTable)
		.where(eq(attachmentsTable.orgId, orgId));

	const totalBytes = Number(result[0]?.totalBytes ?? 0);
	const fileCount = result[0]?.fileCount ?? 0;

	await db.execute(
		sql`
		INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
		VALUES (${orgId}, ${totalBytes}, ${fileCount}, NOW())
		ON CONFLICT (org_id) DO UPDATE
		SET total_bytes = EXCLUDED.total_bytes,
			file_count = EXCLUDED.file_count,
			updated_at = NOW()
		`,
	);

	return {
		totalBytes,
		totalGb: totalBytes / (1024 * 1024 * 1024),
		fileCount,
	};
}

export async function getOrganizationStorageLimits(
	orgId: string,
): Promise<StorageLimits> {
	const plan = await getOrganizationPlanKey(orgId);
	const limits = planLimits[plan] as any;
	const result = {
		storageGb: limits.storageGb,
		maxFileSizeMb: limits.maxFileSizeMb,
		maxFiles: limits.maxFiles,
		plan,
	};

	return result;
}

export async function canUploadFile(
	orgId: string,
	fileSizeBytes: number,
): Promise<UploadPermission> {
	const [usage, limits] = await Promise.all([
		getOrganizationStorageUsage(orgId),
		getOrganizationStorageLimits(orgId),
	]);

	const maxFileSizeBytes = limits.maxFileSizeMb * 1024 * 1024;

	if (fileSizeBytes > maxFileSizeBytes) {
		return {
			allowed: false,
			reason: `File size exceeds plan limit (${limits.maxFileSizeMb}MB)`,
			currentUsageGb: usage.totalGb,
			limitGb: limits.storageGb,
			remainingGb: Math.max(0, limits.storageGb - usage.totalGb),
			maxFileSizeBytes,
			maxFiles: limits.maxFiles,
			fileCount: usage.fileCount,
		};
	}

	const newTotalGb = (usage.totalBytes + fileSizeBytes) / (1024 * 1024 * 1024);

	if (newTotalGb > limits.storageGb) {
		return {
			allowed: false,
			reason: `Storage limit (${limits.storageGb}GB) exceeded`,
			currentUsageGb: usage.totalGb,
			limitGb: limits.storageGb,
			remainingGb: 0,
			maxFileSizeBytes,
			maxFiles: limits.maxFiles,
			fileCount: usage.fileCount,
		};
	}

	return {
		allowed: true,
		currentUsageGb: usage.totalGb,
		limitGb: limits.storageGb,
		remainingGb: Math.max(0, limits.storageGb - usage.totalGb),
		maxFileSizeBytes,
		maxFiles: limits.maxFiles,
		fileCount: usage.fileCount,
	};
}

export async function createPresignedUpload(
	orgId: string,
	contentType: string,
	fileSize: number,
	fileName: string,
): Promise<PresignedUploadResult> {
	if (!s3) throw new Error("Storage not configured");

	const fileKey = `${orgId}/${createId()}-${fileName}`;
	const command = new PutObjectCommand({
		Bucket: _BUCKET_NAME,
		Key: fileKey,
		ContentType: contentType,
		ContentLength: fileSize,
	});

	const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
	const publicUrl = _S3_PUBLIC_URL
		? `${_S3_PUBLIC_URL}/${fileKey}`
		: `${S3_ENDPOINT}/${_BUCKET_NAME}/${fileKey}`;

	return { uploadUrl, fileKey, publicUrl };
}

export async function createBatchPresignedUploads(
	orgId: string,
	files: FileUploadRequest[],
): Promise<BatchPresignedUploadResult> {
	const totalSize = files.reduce((acc, f) => acc + f.fileSizeBytes, 0);
	const permission = await canUploadFile(orgId, totalSize);

	if (!permission.allowed) {
		throw new Error(permission.reason || "Storage limit exceeded");
	}

	const results = await Promise.all(
		files.map(async (file) => {
			const result = await createPresignedUpload(
				orgId,
				file.contentType,
				file.fileSizeBytes,
				file.fileName,
			);
			return { ...result, originalRequest: file };
		}),
	);

	return { files: results, totalSize };
}

export async function saveAttachment(params: {
	orgId: string;
	matterId: string;
	uploaderId: string;
	storageKey: string;
	fileName: string;
	fileType: string;
	fileSize: number;
}): Promise<{ id: string }> {
	const id = createId();

	await db.insert(attachmentsTable).values({
		id,
		orgId: params.orgId,
		matterId: params.matterId,
		uploaderId: params.uploaderId,
		storageKey: params.storageKey,
		fileName: params.fileName,
		fileType: params.fileType,
		fileSize: params.fileSize,
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	const result = await db
		.select({
			totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
			fileCount: sql<number>`COUNT(*)::int`,
		})
		.from(attachmentsTable)
		.where(eq(attachmentsTable.orgId, params.orgId));

	const totalBytes = Number(result[0]?.totalBytes ?? 0);
	const fileCount = result[0]?.fileCount ?? 0;

	await db.execute(
		sql`
		INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
		VALUES (${params.orgId}, ${totalBytes}, ${fileCount}, NOW())
		ON CONFLICT (org_id) DO UPDATE
		SET total_bytes = EXCLUDED.total_bytes,
			file_count = EXCLUDED.file_count,
			updated_at = NOW()
		`,
	);

	return { id };
}

export async function deleteAttachment(
	attachmentId: string,
	orgId: string,
	userId: string,
): Promise<void> {
	await db
		.delete(attachmentsTable)
		.where(eq(attachmentsTable.id, attachmentId));

	const result = await db
		.select({
			totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
			fileCount: sql<number>`COUNT(*)::int`,
		})
		.from(attachmentsTable)
		.where(eq(attachmentsTable.orgId, orgId));

	const totalBytes = Number(result[0]?.totalBytes ?? 0);
	const fileCount = result[0]?.fileCount ?? 0;

	await db.execute(
		sql`
		INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
		VALUES (${orgId}, ${totalBytes}, ${fileCount}, NOW())
		ON CONFLICT (org_id) DO UPDATE
		SET total_bytes = EXCLUDED.total_bytes,
			file_count = EXCLUDED.file_count,
			updated_at = NOW()
		`,
	);

	logger.info(
		`[Storage] Deleted attachment ${attachmentId} by user ${userId} for org ${orgId}`,
	);
}

export async function assertUserCanAccessMatter(
	userId: string,
	matterId: string,
	orgId: string,
): Promise<{ matter: typeof mattersTable.$inferSelect }> {
	const matter = await db.query.mattersTable.findFirst({
		where: and(eq(mattersTable.id, matterId), eq(mattersTable.orgId, orgId)),
	});

	if (!matter) {
		throw new Error(PERMISSION_ERRORS.MATTER_NOT_FOUND);
	}

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

export async function assertUserCanDeleteAttachment(
	userId: string,
	attachmentId: string,
	orgId: string,
): Promise<{ attachment: typeof attachmentsTable.$inferSelect }> {
	const attachment = await db.query.attachmentsTable.findFirst({
		where: eq(attachmentsTable.id, attachmentId),
		with: { matter: true },
	});

	if (!attachment) {
		throw new Error(PERMISSION_ERRORS.ATTACHMENT_NOT_FOUND);
	}

	if (attachment.matter.orgId !== orgId) {
		throw new Error(PERMISSION_ERRORS.ORGANIZATION_ACCESS_DENIED);
	}

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

export { ABSOLUTE_MAX_FILE_SIZE };
