import { mustGetMutator } from "@rocicorp/zero";
import { handleMutateRequest } from "@rocicorp/zero/server";
import { zeroPostgresJS } from "@rocicorp/zero/server/adapters/postgresjs";
import { mutators } from "zero/mutators";
import { schema } from "zero/schema";
import { getServerSession } from "~/lib/auth/server";
import {
	clearUsageCache,
	fetchOrgSubscription,
	fetchOrgUsage,
} from "~/lib/billing/service";
import { getActiveOrganizationId } from "~/lib/organization/service";
import { must } from "~/lib/utils/must";
import type { Route } from "./+types/mutate";

// Create database provider with Postgres adapter
const pgURL = must(
	process.env.ZERO_UPSTREAM_DB,
	"ZERO_UPSTREAM_DB is required",
);

// Use connection string to avoid cross-package postgres type mismatch
const dbProvider = zeroPostgresJS(schema, pgURL);

export async function action({ request }: Route.ActionArgs) {
	// Get session from Better Auth
	const authSession = await getServerSession(request);

	if (!authSession?.user) {
		throw new Error("Authentication required for Zero mutations");
	}

	let activeOrgId = authSession.session.activeOrganizationId;

	if (!authSession.session.activeOrganizationId) {
		activeOrgId = await getActiveOrganizationId(authSession.user.id);
	}

	if (!activeOrgId) {
		throw new Error("No active organization found for user");
	}

	// Fetch subscription and usage details
	const [subscription, usage] = await Promise.all([
		fetchOrgSubscription(activeOrgId),
		fetchOrgUsage(activeOrgId),
	]);

	// Build context from session - this is passed to mutators automatically
	const ctx = {
		userId: authSession.user.id,
		activeOrganizationId: activeOrgId ?? null,
		subscription,
		usage,
		clearUsageCache,
	};

	return await handleMutateRequest(
		dbProvider,
		(transact) =>
			transact(
				async (
					// biome-ignore lint/suspicious/noExplicitAny: zero provides runtime transaction type
					tx: any,
					name,
					args,
				) => {
					const mutator = mustGetMutator(mutators, name);
					await mutator.fn({ tx, ctx, args });
				},
			),
		request,
	);
}
