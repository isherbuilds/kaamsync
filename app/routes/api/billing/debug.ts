import { eq } from "drizzle-orm";
import type { LoaderFunctionArgs } from "react-router";
import { db } from "~/db";
import { customersTable, subscriptionsTable } from "~/db/schema";
import { getServerSession } from "~/lib/auth";
import { productIds } from "~/lib/billing";
import { getOrganizationPlanKey } from "~/lib/server/billing.server";

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

	// Get all customers
	const allCustomers = await db.select().from(customersTable);

	// Get all subscriptions
	const allSubscriptions = await db.select().from(subscriptionsTable);

	// Get customer for this org
	const customer = orgId
		? await db.query.customersTable.findFirst({
				where: eq(customersTable.organizationId, orgId),
			})
		: null;

	// Get subscription directly by orgId (new method)
	const subscriptionByOrg = orgId
		? await db.query.subscriptionsTable.findFirst({
				where: eq(subscriptionsTable.organizationId, orgId),
			})
		: null;

	// Get subscription via customer (old method)
	const subscriptionByCustomer = customer
		? await db.query.subscriptionsTable.findFirst({
				where: eq(subscriptionsTable.customerId, customer.id),
			})
		: null;

	return Response.json({
		debug: {
			userEmail,
			activeOrganizationId: orgId,
			customer: customer ?? "No customer found for this org",
			subscriptionByOrg: subscriptionByOrg ?? "No subscription found by orgId",
			subscriptionByCustomer:
				subscriptionByCustomer ?? "No subscription found by customerId",
			allCustomers: allCustomers.map((c) => ({
				id: c.id,
				email: c.email,
				dodoCustomerId: c.dodoCustomerId,
				organizationId: c.organizationId || "(empty)",
			})),
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
			configuredProductIds: productIds,
		},
	});
}
