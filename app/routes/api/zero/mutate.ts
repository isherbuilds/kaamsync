import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { zeroPostgresJS } from "@rocicorp/zero/server/adapters/postgresjs";
import postgres from "postgres";
import { data } from "react-router";
import { mutators } from "zero/mutators";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth/server";
import { invalidateUsageCache } from "~/lib/billing/service";
import {
	assertAuthenticated,
	ErrorFactory,
	handleDatabaseError,
	withErrorHandler,
} from "~/lib/infra/errors";
import { getActiveOrganization } from "~/lib/organization/service";
import { must } from "~/lib/utils/must";

// Create database provider with Postgres adapter
const pgURL = must(
	process.env.ZERO_UPSTREAM_DB,
	"ZERO_UPSTREAM_DB is required",
);
const dbProvider = zeroPostgresJS(schema, postgres(pgURL));

export const action = withErrorHandler(
	async ({ request }: { request: Request }) => {
		// Get session from Better Auth
		const authSession = await getServerSession(request);

		// Use standardized authentication check
		assertAuthenticated(
			authSession?.user,
			"Authentication required for Zero mutations",
		);

		let activeOrgId = authSession.session.activeOrganizationId;

		if (!authSession.session.activeOrganizationId) {
			activeOrgId = await getActiveOrganization(authSession.user.id);
		}

		// Build context from session - this is passed to mutators automatically
		const ctx = {
			userId: authSession.user.id,
			activeOrganizationId: activeOrgId ?? null,
			invalidateUsageCache,
		};

		try {
			return data(
				await handleMutateRequest(
					dbProvider,
					(transact) =>
						transact(async (tx: any, name: string, args: any) => {
							const mutator = mustGetMutator(mutators, name);
							await mutator.fn({ tx, ctx, args });
						}),
					request,
				),
			);
		} catch (error) {
			console.error("[Zero:mutate] Mutation execution failed:", error);

			// Handle database-specific errors
			if (error instanceof Error && error.message.includes("constraint")) {
				handleDatabaseError(error);
			}

			throw ErrorFactory.internal("Mutation execution failed");
		}
	},
);
