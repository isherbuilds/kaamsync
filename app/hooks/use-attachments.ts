/**
 * useAttachments - React hook for file uploads
 * Supports parallel uploads, batch operations, and real-time progress
 */
import { useCallback, useState } from "react";
import {
	ABSOLUTE_MAX_FILE_SIZE,
	ALLOWED_ATTACHMENT_TYPES,
} from "~/lib/constants/attachment";

export interface UploadResult {
	id: string;
	publicUrl: string;
	fileName: string;
	fileSize: number;
	originalSize?: number;
	fileId: string;
}

export interface UploadProgress {
	fileId: string;
	fileName: string;
	progress: number;
	status: "uploading" | "saving" | "compressing" | "complete" | "error";
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
	onUploadProgress?: (progress: UploadProgress) => void;
	onError?: (error: string) => void;
	maxRetries?: number;
	parallelUploads?: number;
}

const COMPRESSIBLE_TYPES: readonly string[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];
const COMPRESSION_QUALITY = 0.8;
const MAX_COMPRESS_WIDTH = 4096;

type AllowedTypes = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

async function compressImage(
	file: File,
	fileId: string,
): Promise<{ file: File; originalSize: number }> {
	if (!COMPRESSIBLE_TYPES.includes(file.type)) {
		return { file, originalSize: file.size };
	}

	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			const canvas = document.createElement("canvas");
			let { width, height } = img;

			if (width > MAX_COMPRESS_WIDTH) {
				height = (height * MAX_COMPRESS_WIDTH) / width;
				width = MAX_COMPRESS_WIDTH;
			}

			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(blob) => {
					if (!blob) {
						reject(new Error("Compression failed"));
						return;
					}

					const compressedFile = new File([blob], file.name, {
						type: file.type,
						lastModified: Date.now(),
					});

					resolve({ file: compressedFile, originalSize: file.size });
				},
				file.type,
				COMPRESSION_QUALITY,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image for compression"));
		};

		img.src = url;
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
	url: string,
	options: RequestInit,
	maxRetries: number = 3,
): Promise<Response> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			const response = await fetch(url, options);
			if (response.ok) return response;

			if (response.status >= 400 && response.status < 500) {
				return response;
			}
		} catch (error) {
			lastError = error instanceof Error ? error : new Error("Network error");
		}

		if (attempt < maxRetries) {
			const delay = 1000 * 2 ** attempt;
			await sleep(delay + Math.random() * 500);
		}
	}

	throw lastError ?? new Error("Request failed after retries");
}

type UploadProgressCallback = (loaded: number, total: number) => void;

function uploadWithXHR(
	url: string,
	file: File,
	contentType: string,
	onProgress: UploadProgressCallback,
	signal?: AbortSignal,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				onProgress(e.loaded, e.total);
			}
		};

		xhr.upload.onload = () => resolve();
		xhr.upload.onerror = () => reject(new Error("Upload failed"));

		xhr.onerror = () => reject(new Error("Network error"));
		xhr.onabort = () => reject(new Error("Upload cancelled"));

		xhr.open("PUT", url);
		xhr.setRequestHeader("Content-Type", contentType);
		xhr.send(file);

		signal?.addEventListener("abort", () => {
			xhr.abort();
			reject(new Error("Upload cancelled"));
		});
	});
}

export function useAttachments(options: UseAttachmentsOptions = {}) {
	const [uploading, setUploading] = useState(false);
	const [progressMap, setProgressMap] = useState<Map<string, UploadProgress>>(
		new Map(),
	);
	const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

	const updateProgress = useCallback(
		(progress: UploadProgress) => {
			setProgressMap((prev) => {
				const next = new Map(prev);
				next.set(progress.fileId, progress);
				return next;
			});
			options.onUploadProgress?.(progress);
		},
		[options],
	);

	const validateFileType = useCallback((file: File): string | null => {
		if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type as AllowedTypes)) {
			return `File type "${file.type}" not allowed. Use images, PDFs, documents, or archives.`;
		}
		if (file.size > ABSOLUTE_MAX_FILE_SIZE) {
			return `File too large. Maximum size is 1000MB.`;
		}
		return null;
	}, []);

	const canUpload = useCallback(
		(file: File): { allowed: boolean; reason?: string } => {
			const typeError = validateFileType(file);
			if (typeError) return { allowed: false, reason: typeError };

			if (storageInfo?.limits) {
				const { maxFileSizeMb, maxFiles, remainingGb } = storageInfo.limits;
				const { fileCount } = storageInfo.usage || { fileCount: 0 };

				if (maxFileSizeMb !== -1 && file.size > maxFileSizeMb * 1024 * 1024) {
					return {
						allowed: false,
						reason: `File too large. Your plan allows up to ${maxFileSizeMb}MB per file.`,
					};
				}

				if (maxFiles !== -1 && fileCount >= maxFiles) {
					return {
						allowed: false,
						reason: `File limit (${maxFiles} files) reached. Upgrade or delete files.`,
					};
				}

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

	const uploadFile = useCallback(
		async (
			file: File,
			matterId: string,
			signal?: AbortSignal,
		): Promise<UploadResult | null> => {
			const typeError = validateFileType(file);
			if (typeError) {
				options.onError?.(typeError);
				return null;
			}

			setUploading(true);
			const fileId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

			updateProgress({
				fileId,
				fileName: file.name,
				progress: 0,
				status: "compressing",
			});

			try {
				const { file: uploadFile, originalSize } = await compressImage(
					file,
					fileId,
				);

				if (signal?.aborted) {
					throw new Error("Upload cancelled");
				}

				updateProgress({
					fileId,
					fileName: file.name,
					progress: 10,
					status: "uploading",
				});

				const presignedResponse = await fetchWithRetry(
					"/api/attachments",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							_action: "presigned-url",
							contentType: uploadFile.type,
							fileSize: uploadFile.size,
							fileName: uploadFile.name,
						}),
						signal,
					},
					options.maxRetries,
				);

				if (!presignedResponse.ok) {
					const error = await presignedResponse.json();
					throw new Error(error.error || "Failed to get upload URL");
				}

				const { uploadUrl, fileKey, publicUrl } =
					await presignedResponse.json();

				updateProgress({
					fileId,
					fileName: file.name,
					progress: 25,
					status: "uploading",
				});

				await uploadWithXHR(
					uploadUrl,
					uploadFile,
					uploadFile.type,
					(loaded, total) => {
						const uploadPercent = Math.round((loaded / total) * 60);
						const overallProgress = 25 + uploadPercent;
						updateProgress({
							fileId,
							fileName: file.name,
							progress: Math.min(overallProgress, 85),
							status: "uploading",
						});
					},
					signal,
				);

				updateProgress({
					fileId,
					fileName: file.name,
					progress: 85,
					status: "saving",
				});

				const saveResponse = await fetchWithRetry(
					"/api/attachments",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							_action: "save",
							matterId,
							storageKey: fileKey,
							fileName: uploadFile.name,
							fileType: uploadFile.type,
							fileSize: uploadFile.size,
						}),
						signal,
					},
					options.maxRetries,
				);

				if (!saveResponse.ok) {
					const error = await saveResponse.json();
					throw new Error(error.error || "Failed to save attachment");
				}

				const { id } = await saveResponse.json();

				updateProgress({
					fileId,
					fileName: file.name,
					progress: 100,
					status: "complete",
				});

				const result: UploadResult = {
					id,
					publicUrl,
					fileName: uploadFile.name,
					fileSize: uploadFile.size,
					fileId,
					originalSize:
						originalSize !== uploadFile.size ? originalSize : undefined,
				};

				refreshStorageInfo();
				options.onUploadComplete?.(result);
				return result;
			} catch (error) {
				if (signal?.aborted) {
					updateProgress({
						fileId,
						fileName: file.name,
						progress: 0,
						status: "error",
						error: "Upload cancelled",
					});
					options.onError?.("Upload cancelled");
				} else {
					const message =
						error instanceof Error ? error.message : "Upload failed";
					updateProgress({
						fileId,
						fileName: file.name,
						progress: 0,
						status: "error",
						error: message,
					});
					options.onError?.(message);
				}
				return null;
			} finally {
				setUploading(false);
			}
		},
		[validateFileType, updateProgress, refreshStorageInfo, options],
	);

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
					refreshStorageInfo();
					return true;
				}
				return false;
			} catch {
				return false;
			}
		},
		[refreshStorageInfo],
	);

	return {
		uploadFile,
		deleteAttachment,
		refreshStorageInfo,
		canUpload,
		validateFileType,
		uploading,
		progressMap,
		storageInfo,
		absoluteMaxFileSize: ABSOLUTE_MAX_FILE_SIZE,
	};
}
