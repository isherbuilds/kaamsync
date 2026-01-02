import { eq } from "drizzle-orm";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema/auth-schema";
import { dodoPayments } from "../auth";
import { PLAN_ID } from "../pricing";

/**
 * Updates the subscription quantity (seats) in Dodo Payments for Business plan organizations.
 * This should be called whenever a non-guest member is added or removed.
 */
export async function syncDodoSubscriptionSeats(organizationId: string) {
	try {
		const org = await db.query.organizationsTable.findFirst({
			where: eq(organizationsTable.id, organizationId),
		});

		if (!org || org.plan !== PLAN_ID.BUSINESS || !org.subscriptionId) {
			return;
		}

		// Count active non-guest members
		const members = await db.query.membersTable.findMany({
			where: (members, { eq }) => eq(members.organizationId, organizationId),
		});

		const paidSeats = members.filter((m) => m.role !== "guest").length;

		console.log(
			`Syncing Dodo seats for org ${organizationId}: ${paidSeats} seats (subscription: ${org.subscriptionId})`,
		);

		// Dodo Payments SDK changePlan call
		await dodoPayments.subscriptions.changePlan(org.subscriptionId, {
			product_id: org.productId || "",
			quantity: paidSeats,
			proration_billing_mode: "prorated_immediately",
		});

		// Update locally cached billedSeats count.
		// We use direct DB for this since billing fields are marked input: false in auth.ts
		await db
			.update(organizationsTable)
			.set({ billedSeats: paidSeats })
			.where(eq(organizationsTable.id, organizationId));
	} catch (error) {
		console.error("Failed to sync Dodo subscription seats:", error);
	}
}
