import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { data } from "react-router";
import { queries } from "zero/queries";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth";
import { getActiveOrganization } from "~/lib/server/organization.server";

export async function action({ request }: { request: Request }) {
	const authSession = await getServerSession(request);

	let activeOrgId = authSession?.session.activeOrganizationId;

	if (!authSession?.user) {
		console.error("❌ [zero.query] Unauthorized - no session");
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	// Get active organization
	if (!authSession.session.activeOrganizationId) {
		activeOrgId = await getActiveOrganization(authSession.user.id);
	}

	// Build context from session - this is passed to queries automatically
	const ctx = {
		userId: authSession.user.id,
		activeOrganizationId: activeOrgId ?? null,
	};

	return data(
		await handleQueryRequest(
			(name, args) => {
				const query = mustGetQuery(queries, name);
				// query.fn receives ctx and args, returns ZQL
				return query.fn({ ctx, args });
			},
			schema,
			request,
		),
	);
}
