/**
 * Shared constants for file attachments
 * Used by both client (hooks) and server (storage service)
 */

/**
 * Allowed MIME types for file uploads (like Linear/GitHub)
 */
export const ALLOWED_ATTACHMENT_TYPES = [
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	// Documents
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"text/plain",
	"text/csv",
	// Archives
	"application/zip",
	"application/x-rar-compressed",
] as const;

export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

/**
 * Set version for O(1) lookup on server
 * Uses Set<string> to allow checking arbitrary strings
 */
export const ALLOWED_ATTACHMENT_TYPES_SET: Set<string> = new Set(
	ALLOWED_ATTACHMENT_TYPES,
);

/**
 * Absolute maximum file size (100MB) - enterprise limit
 * Actual limits per plan are enforced server-side
 */
export const ABSOLUTE_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Check if a MIME type is allowed
 */
export function isAllowedAttachmentType(mimeType: string): boolean {
	return ALLOWED_ATTACHMENT_TYPES_SET.has(mimeType);
}
