/**
 * @file Server-side authentication utilities and middleware
 * @description Provides session validation, authentication guards, and audit logging
 * for protected routes. Used as middleware to ensure requests are authenticated.
 *
 * Key exports:
 * - requireSession() - Validates session exists, logs denial events, throws 401 on failure
 *
 * @see app/lib/auth.ts for auth configuration
 * @see app/lib/audit-logger.ts for audit event logging
 */

import { data } from "react-router";
import { getServerSession } from "~/lib/auth/auth.server";
import {
	auditLog,
	getRequestIP,
	getRequestUserAgent,
} from "~/lib/logging/audit-logger";

/**
 * Require an authenticated session on the server.
 * Logs a denied audit event and throws a 401 response when unauthenticated.
 */
export async function requireSession(
	request: Request,
	auditAction = "auth.require_session",
) {
	const session = await getServerSession(request);

	if (!session?.user) {
		auditLog({
			action: auditAction,
			actorId: "anonymous",
			outcome: "denied",
			reason: "Unauthenticated request",
			ip: getRequestIP(request),
			userAgent: getRequestUserAgent(request),
		});

		throw data({ error: "Unauthorized" }, { status: 401 });
	}

	return session;
}
