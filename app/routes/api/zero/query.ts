import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { queries } from "zero/queries";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth/server";
import { assertAuthenticated } from "~/lib/infra/errors";
import { getActiveOrganizationId } from "~/lib/organization/service";

import type { Route } from "./+types/query.ts";

export async function loader() {
	return null;
}

export async function action({ request }: Route.ActionArgs) {
	const authSession = await getServerSession(request);

	// Use standardized authentication check
	assertAuthenticated(
		authSession?.user,
		"Authentication required for Zero queries",
	);

	let activeOrgId = authSession.session.activeOrganizationId;

	// Get active organization if not in session
	if (!authSession.session.activeOrganizationId) {
		activeOrgId = await getActiveOrganizationId(authSession.user.id);
	}

	if (!activeOrgId) {
		throw new Error("No active organization found for user");
	}

	// Build context from session - this is passed to queries automatically
	const ctx = {
		userId: authSession.user.id,
		activeOrganizationId: activeOrgId,
	};

	return await handleQueryRequest(
		(name, args) => {
			const query = mustGetQuery(queries, name);
			return query.fn({ ctx, args });
		},
		schema,
		request,
	);
}
