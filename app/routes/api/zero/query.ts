import { mustGetQuery } from "@rocicorp/zero";
import { handleQueryRequest } from "@rocicorp/zero/server";
import { data } from "react-router";
import { queries } from "zero/queries";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth/auth.server";
import {
	assertAuthenticated,
	ErrorFactory,
	withErrorHandler,
} from "~/lib/logging/error-handler.server";
import { getActiveOrganization } from "~/lib/server/organization.server";

export const action = withErrorHandler(
	async ({ request }: { request: Request }) => {
		const authSession = await getServerSession(request);

		// Use standardized authentication check
		assertAuthenticated(
			authSession?.user,
			"Authentication required for Zero queries",
		);

		let activeOrgId = authSession.session.activeOrganizationId;

		// Get active organization if not in session
		if (!authSession.session.activeOrganizationId) {
			activeOrgId = await getActiveOrganization(authSession.user.id);
		}

		// Build context from session - this is passed to queries automatically
		const ctx = {
			userId: authSession.user.id,
			activeOrganizationId: activeOrgId ?? null,
		};

		try {
			return data(
				await handleQueryRequest(
					(name, args) => {
						const query = mustGetQuery(queries, name);
						return query.fn({ ctx, args });
					},
					schema,
					request,
				),
			);
		} catch (error) {
			console.error("❌ [zero.query] Query execution failed:", error);
			throw ErrorFactory.internal("Query execution failed");
		}
	},
);
