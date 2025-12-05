import { type ReadonlyJSONValue, withValidation } from "@rocicorp/zero";
import { handleGetQueriesRequest } from "@rocicorp/zero/server";
import { data } from "react-router";
import { type QueryContext, queries } from "zero/queries";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth";
import { getActiveOrganization } from "~/lib/server/organization.server";

// Validate all queries
const validated = Object.fromEntries(
	Object.values(queries).map((q) => [q.queryName, withValidation(q)]),
);

export async function action({ request }: { request: Request }) {
	const authSession = await getServerSession(request);

	let activeOrgId = authSession?.session.activeOrganizationId;

	if (!authSession?.user) {
		console.error("❌ [zero.get-queries] Unauthorized - no session");
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get active organization
	if (!authSession.session.activeOrganizationId) {
		activeOrgId = await getActiveOrganization(authSession.user.id);
	}

	// Build query context from session
	const context: QueryContext = {
		sub: authSession.user.id,
		activeOrganizationId: activeOrgId ?? null,
	};
	return data(
		await handleGetQueriesRequest(
			(name, args) => getQuery(context, name, args),
			schema,
			request,
		),
	);
}

function getQuery(
	context: QueryContext,
	name: string,
	args: readonly ReadonlyJSONValue[],
) {
	const q = validated[name];
	if (!q) {
		throw new Error(`Unknown query: ${name}`);
	}
	// Pass context as first arg (for contextful queries)
	return { query: q(context, ...args) };
}
