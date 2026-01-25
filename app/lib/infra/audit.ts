/**
 * Audit logging system for security-sensitive operations
 * Logs actions to console with structured format
 * In production, this should write to a dedicated audit log table or service
 */

import { logger } from "~/lib/utils/logger";

export interface AuditLogEntry {
	/** Type of action being audited */
	action: string;
	/** ID of user performing the action */
	actorId: string;
	/** Optional target user ID */
	targetId?: string;
	/** Outcome of the action */
	outcome: "success" | "denied" | "error";
	/** Reason for denial or error message */
	reason?: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
	/** Request IP address */
	ip?: string;
	/** User agent */
	userAgent?: string;
}

/**
 * Log an audit event
 * @param entry Audit log entry
 */
export async function auditLog(entry: AuditLogEntry) {
	try {
		const timestamp = new Date().toISOString();

		const logEntry = {
			timestamp,
			...entry,
		};

		// In production, write to audit table or external service
		// For now, log to console with clear formatting
		if (entry.outcome === "denied" || entry.outcome === "error") {
			logger.warn("[AUDIT]", JSON.stringify(logEntry, null, 2));
		} else {
			logger.info("[AUDIT]", JSON.stringify(logEntry, null, 2));
		}

		// TODO: Write to database audit table
		// await db.insert(auditLogsTable).values({
		//   id: uuid(),
		//   action: entry.action,
		//   actorId: entry.actorId,
		//   targetId: entry.targetId,
		//   outcome: entry.outcome,
		//   reason: entry.reason,
		//   metadata: JSON.stringify(entry.metadata),
		//   ip: entry.ip,
		//   userAgent: entry.userAgent,
		//   createdAt: new Date(),
		// });
	} catch (error) {
		// Audit logging failure should not crash the app
		console.error("[AUDIT] Failed to log audit event:", error);
	}
}

/**
 * Extract IP address from request
 * @param request Request object
 * @returns IP address or undefined
 */
export function getRequestIP(request: Request): string | undefined {
	// Try common headers first (for proxies/load balancers)
	const forwardedFor = request.headers.get("x-forwarded-for");
	if (forwardedFor) {
		return forwardedFor.split(",")[0].trim();
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp) {
		return realIp;
	}

	// Fallback to direct connection
	return request.headers.get("cf-connecting-ip") || undefined;
}

/**
 * Get user agent from request
 * @param request Request object
 * @returns User agent or undefined
 */
export function getRequestUserAgent(request: Request): string | undefined {
	return request.headers.get("user-agent") || undefined;
}
