/**
 * useAttachments - React hook for file uploads
 * Following zbugs pattern: get presigned URL → upload to S3 → save record
 */
import { useCallback, useState } from "react";
import {
	ABSOLUTE_MAX_FILE_SIZE,
	ALLOWED_ATTACHMENT_TYPES,
} from "~/config/attachments";

export interface UploadResult {
	id: string;
	publicUrl: string;
	fileName: string;
	fileSize: number;
}

export interface UploadProgress {
	fileName: string;
	progress: number; // 0-100
	status: "uploading" | "saving" | "complete" | "error";
	error?: string;
}

export interface StorageInfo {
	configured: boolean;
	plan?: string;
	usage?: {
		totalBytes: number;
		totalGb: number;
		fileCount: number;
	};
	limits?: {
		storageGb: number;
		maxFileSizeMb: number;
		maxFiles: number;
		remainingGb: number;
	};
}

interface UseAttachmentsOptions {
	onUploadComplete?: (result: UploadResult) => void;
	onError?: (error: string) => void;
}

// Re-export for backwards compatibility
const ALLOWED_TYPES: readonly string[] = ALLOWED_ATTACHMENT_TYPES;

export function useAttachments(options: UseAttachmentsOptions = {}) {
	const [uploading, setUploading] = useState(false);
	const [progress, setProgress] = useState<UploadProgress | null>(null);
	const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

	/**
	 * Validate file type (size checked server-side based on plan)
	 */
	const validateFileType = useCallback((file: File): string | null => {
		if (!ALLOWED_TYPES.includes(file.type)) {
			return `File type "${file.type}" not allowed. Use images, PDFs, documents, or archives.`;
		}
		if (file.size > ABSOLUTE_MAX_FILE_SIZE) {
			return `File too large. Maximum size is 100MB.`;
		}
		return null;
	}, []);

	/**
	 * Check if file can be uploaded based on current limits
	 */
	const canUpload = useCallback(
		(file: File): { allowed: boolean; reason?: string } => {
			// Type check
			const typeError = validateFileType(file);
			if (typeError) return { allowed: false, reason: typeError };

			// Check against cached storage info
			if (storageInfo?.limits) {
				const { maxFileSizeMb, maxFiles, remainingGb } = storageInfo.limits;
				const { fileCount } = storageInfo.usage || {
					fileCount: 0,
				};

				// File size limit per plan
				if (maxFileSizeMb !== -1 && file.size > maxFileSizeMb * 1024 * 1024) {
					return {
						allowed: false,
						reason: `File too large. Your plan allows up to ${maxFileSizeMb}MB per file.`,
					};
				}

				// File count limit
				if (maxFiles !== -1 && fileCount >= maxFiles) {
					return {
						allowed: false,
						reason: `File limit (${maxFiles} files) reached. Upgrade or delete files.`,
					};
				}

				// Storage limit
				const fileSizeGb = file.size / (1024 * 1024 * 1024);
				if (remainingGb !== -1 && fileSizeGb > remainingGb) {
					return {
						allowed: false,
						reason: `Not enough storage. ${remainingGb.toFixed(2)}GB remaining.`,
					};
				}
			}

			return { allowed: true };
		},
		[validateFileType, storageInfo],
	);

	/**
	 * Get storage usage info and cache it
	 */
	const refreshStorageInfo =
		useCallback(async (): Promise<StorageInfo | null> => {
			try {
				const response = await fetch("/api/attachments");
				if (!response.ok) return null;
				const info = await response.json();
				setStorageInfo(info);
				return info;
			} catch {
				return null;
			}
		}, []);

	/**
	 * Upload a file to an attachment on a matter
	 */
	const uploadFile = useCallback(
		async (file: File, matterId: string): Promise<UploadResult | null> => {
			// Client-side validation (server does full check)
			const typeError = validateFileType(file);
			if (typeError) {
				options.onError?.(typeError);
				return null;
			}

			setUploading(true);
			setProgress({
				fileName: file.name,
				progress: 0,
				status: "uploading",
			});

			try {
				// 1. Get presigned URL (server validates all limits)
				const presignedResponse = await fetch("/api/attachments", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						_action: "presigned-url",
						contentType: file.type,
						fileSize: file.size,
						fileName: file.name,
					}),
				});

				if (!presignedResponse.ok) {
					const error = await presignedResponse.json();
					throw new Error(error.error || "Failed to get upload URL");
				}

				const { uploadUrl, fileKey, publicUrl } =
					await presignedResponse.json();

				setProgress({
					fileName: file.name,
					progress: 20,
					status: "uploading",
				});

				// 2. Upload directly to S3
				const uploadResponse = await fetch(uploadUrl, {
					method: "PUT",
					body: file,
					headers: { "Content-Type": file.type },
				});

				if (!uploadResponse.ok) {
					throw new Error("Failed to upload file to storage");
				}

				setProgress({
					fileName: file.name,
					progress: 80,
					status: "saving",
				});

				// 3. Save attachment record
				const saveResponse = await fetch("/api/attachments", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						_action: "save",
						matterId,
						storageKey: fileKey,
						fileName: file.name,
						fileType: file.type,
						fileSize: file.size,
					}),
				});

				if (!saveResponse.ok) {
					const error = await saveResponse.json();
					throw new Error(error.error || "Failed to save attachment");
				}

				const { id } = await saveResponse.json();

				setProgress({
					fileName: file.name,
					progress: 100,
					status: "complete",
				});

				const result: UploadResult = {
					id,
					publicUrl,
					fileName: file.name,
					fileSize: file.size,
				};

				// Refresh storage info after upload
				refreshStorageInfo();

				options.onUploadComplete?.(result);
				return result;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Upload failed";
				setProgress({
					fileName: file.name,
					progress: 0,
					status: "error",
					error: message,
				});
				options.onError?.(message);
				return null;
			} finally {
				setUploading(false);
			}
		},
		[
			validateFileType,
			options, // Refresh storage info after upload
			refreshStorageInfo,
		],
	);

	/**
	 * Delete an attachment
	 */
	const deleteAttachment = useCallback(
		async (attachmentId: string): Promise<boolean> => {
			try {
				const response = await fetch("/api/attachments", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						_action: "delete",
						attachmentId,
					}),
				});

				if (response.ok) {
					// Refresh storage info after delete
					refreshStorageInfo();
					return true;
				}
				return false;
			} catch {
				return false;
			}
		},
		[
			// Refresh storage info after delete
			refreshStorageInfo,
		],
	);

	return {
		uploadFile,
		deleteAttachment,
		refreshStorageInfo,
		canUpload,
		validateFileType,
		uploading,
		progress,
		storageInfo,
		allowedTypes: ALLOWED_TYPES,
		absoluteMaxFileSize: ABSOLUTE_MAX_FILE_SIZE,
	};
}
