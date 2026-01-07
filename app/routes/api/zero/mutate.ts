import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { zeroPostgresJS } from "@rocicorp/zero/server/adapters/postgresjs";
import postgres from "postgres";
import { data } from "react-router";
import { must } from "shared/must";
import { mutators } from "zero/mutators";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth";
import { getActiveOrganization } from "~/lib/server/organization.server";

// Create database provider with Postgres adapter
const pgURL = must(
	process.env.ZERO_UPSTREAM_DB,
	"ZERO_UPSTREAM_DB is required",
);
const dbProvider = zeroPostgresJS(schema, postgres(pgURL));

export async function action({ request }: { request: Request }) {
	// Get session from Better Auth
	const authSession = await getServerSession(request);

	if (!authSession?.user) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	let activeOrgId = authSession.session.activeOrganizationId;

	if (!authSession.session.activeOrganizationId) {
		activeOrgId = await getActiveOrganization(authSession.user.id);
	}

	// Build context from session - this is passed to mutators automatically
	const ctx = {
		userId: authSession.user.id,
		activeOrganizationId: activeOrgId ?? null,
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
	} catch (err) {
		console.error("[Zero:mutate] Error:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
