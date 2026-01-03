import { eq } from "drizzle-orm";
import { db } from "~/db";
import { orgRole } from "~/db/helpers";
import { organizationsTable } from "~/db/schema/auth-schema";
import { dodoPayments } from "~/lib/auth/dodo";
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

		// Count non-guest members (all members count as paid seats regardless of status)
		const members = await db.query.membersTable.findMany({
			where: (members, { eq }) => eq(members.organizationId, organizationId),
		});

		const paidSeats = members.filter((m) => m.role !== orgRole.guest).length;

		console.log(
			`Syncing Dodo seats for org ${organizationId}: ${paidSeats} seats (subscription: ${org.subscriptionId})`,
		);

		if (!org.productId) {
			console.error(
				`Missing productId for org ${organizationId}, cannot sync seats`,
			);
			return;
		}

		// Dodo Payments SDK changePlan call
		await dodoPayments.subscriptions.changePlan(org.subscriptionId, {
			product_id: org.productId,
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
