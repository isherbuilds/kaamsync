/**
 * Audit logging system for security-sensitive operations.
 * Logs actions to console with structured format.
 * In production, this should write to a dedicated audit log table or service.
 */

import { logger } from "~/lib/utils/logger";

// ============================================================================
// Types
// ============================================================================

export type AuditOutcome = "success" | "denied" | "error";

export interface AuditEntry {
	action: string;
	actorId: string;
	targetId?: string;
	outcome: AuditOutcome;
	reason?: string;
	metadata?: Record<string, unknown>;
	ip?: string;
	userAgent?: string;
}

// ============================================================================
// Audit Logging
// ============================================================================

export async function auditLog(entry: AuditEntry): Promise<void> {
	try {
		const logEntry = {
			timestamp: new Date().toISOString(),
			...entry,
		};

		if (entry.outcome === "denied" || entry.outcome === "error") {
			logger.warn("[AUDIT]", JSON.stringify(logEntry, null, 2));
		} else {
			logger.info("[AUDIT]", JSON.stringify(logEntry, null, 2));
		}

		// TODO: Write to database audit table
	} catch (error) {
		console.error("[AUDIT] Failed to log audit event:", error);
	}
}

// ============================================================================
// Request Utilities
// ============================================================================

export function getRequestIP(request: Request): string | undefined {
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0].trim();
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	return request.headers.get("cf-connecting-ip") || undefined;
}

export function getRequestUserAgent(request: Request): string | undefined {
	return request.headers.get("user-agent") || undefined;
}
