import { data } from "react-router";
import {
	auditLog,
	getRequestIP,
	getRequestUserAgent,
} from "~/lib/audit-logger";
import { getServerSession } from "~/lib/auth";

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
