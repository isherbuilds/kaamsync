import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db";
import { subscriptionsTable } from "~/db/schema";
import { getServerSession } from "~/lib/auth/auth.server";
import { getOrganizationPlanKey } from "~/lib/billing/billing.server";

/**
 * Debug endpoint to check billing status
 * GET /api/billing/debug
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const session = await getServerSession(request);

	if (!session?.session) {
		return Response.json({ error: "Not authenticated" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;
	const userEmail = session.user?.email;

	// Get effective plan using our new helper
	const effectivePlan = orgId ? await getOrganizationPlanKey(orgId) : "starter";

	// Get all subscriptions
	const allSubscriptions = await db.select().from(subscriptionsTable);

	// Get subscription directly by orgId (new method)
	const subscriptionByOrg = orgId
		? await db.query.subscriptionsTable.findFirst({
				where: eq(subscriptionsTable.organizationId, orgId),
			})
		: null;

	return Response.json({
		debug: {
			userEmail,
			activeOrganizationId: orgId,
			subscriptionByOrg: subscriptionByOrg ?? "No subscription found by orgId",
			allSubscriptions: allSubscriptions.map((s) => ({
				id: s.id,
				customerId: s.customerId,
				organizationId: s.organizationId || "(empty)",
				dodoSubscriptionId: s.dodoSubscriptionId,
				productId: s.productId,
				planKey: s.planKey || "(not set)",
				status: s.status,
			})),
			effectivePlan,
		},
	});
}
