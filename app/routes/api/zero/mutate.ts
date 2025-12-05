import { PushProcessor } from "@rocicorp/zero/server";
import { zeroPostgresJS } from "@rocicorp/zero/server/adapters/postgresjs";
import postgres from "postgres";
import { data } from "react-router";
import { must } from "shared/must";
import { createMutators } from "zero/mutators";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth";
import { getActiveOrganization } from "~/lib/server/organization.server";

// Create processor with Postgres adapter
const pgURL = must(
	process.env.ZERO_UPSTREAM_DB,
	"ZERO_UPSTREAM_DB is required",
);
const processor = new PushProcessor(zeroPostgresJS(schema, postgres(pgURL)));

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

	const authData = {
		sub: authSession.user.id,
		activeOrganizationId: activeOrgId ?? null,
	};

	try {
		return data(await processor.process(createMutators(authData), request));
	} catch (err) {
		console.error("Mutate error:", err);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
