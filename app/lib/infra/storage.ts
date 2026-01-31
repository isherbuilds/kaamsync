import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/lib/infra/env";

const hasStorageConfig =
	!!env.STORAGE_ACCESS_KEY_ID &&
	!!env.STORAGE_SECRET_ACCESS_KEY &&
	!!env.STORAGE_BUCKET_NAME;

const storageClient = hasStorageConfig
	? new S3Client({
			region: env.STORAGE_REGION,
			endpoint: env.STORAGE_ENDPOINT,
			forcePathStyle: !!env.STORAGE_ENDPOINT,
			credentials: {
				accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
				secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
			},
		})
	: null;

export type PresignResult = {
	uploadUrl: string;
	storageKey: string;
	publicUrl: string;
};

export function getStorageClient(): S3Client {
	if (!storageClient || !env.STORAGE_BUCKET_NAME) {
		throw new Error("Storage is not configured");
	}
	return storageClient;
}

export function buildStorageKey(
	orgId: string,
	fileId: string,
	fileName: string,
) {
	const sanitizedName = fileName.trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
	return `org/${orgId}/${fileId}/${sanitizedName}`;
}

export function buildPublicUrl(storageKey: string) {
	if (!env.STORAGE_PUBLIC_URL) {
		return storageKey;
	}
	return `${env.STORAGE_PUBLIC_URL.replace(/\/$/, "")}/${storageKey}`;
}

export async function getPresignedUploadUrl(
	storageKey: string,
	contentType: string,
): Promise<string> {
	const client = getStorageClient();
	const command = new PutObjectCommand({
		Bucket: env.STORAGE_BUCKET_NAME,
		Key: storageKey,
		ContentType: contentType,
	});
	return getSignedUrl(client, command, { expiresIn: 60 * 10 });
}

export async function createPresignedUpload(
	orgId: string,
	fileId: string,
	fileName: string,
	contentType: string,
): Promise<PresignResult> {
	const storageKey = buildStorageKey(orgId, fileId, fileName);
	const uploadUrl = await getPresignedUploadUrl(storageKey, contentType);
	return {
		uploadUrl,
		storageKey,
		publicUrl: buildPublicUrl(storageKey),
	};
}
