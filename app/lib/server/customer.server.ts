import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { customersTable, organizationsTable } from "~/db/schema";
import { dodoPayments } from "~/lib/billing";

/**
 * Get or create a Dodo Payments customer for an organization
 */
export async function getOrCreateCustomer(organizationId: string): Promise<{
	id: string;
	dodoCustomerId: string | null;
	email: string;
	name: string | null;
	organizationId: string;
}> {
	// Check if customer already exists
	const existingCustomer = await db.query.customersTable.findFirst({
		where: eq(customersTable.organizationId, organizationId),
	});

	if (existingCustomer) {
		return existingCustomer;
	}

	// Get organization details
	const organization = await db.query.organizationsTable.findFirst({
		where: eq(organizationsTable.id, organizationId),
	});

	if (!organization) {
		throw new Error("Organization not found");
	}

	// Create customer in Dodo Payments if billing is enabled
	let dodoCustomerId: string | null = null;
	if (dodoPayments) {
		try {
			const dodoCustomer = await dodoPayments.customers.create({
				email: organization.email || `org-${organizationId}@kaamsync.com`,
				name: organization.name,
				metadata: {
					organization_id: organizationId,
					source: "kaamsync",
				},
			});
			dodoCustomerId = dodoCustomer.customer_id;
		} catch (error) {
			console.error("[Customer] Failed to create Dodo customer:", error);
			// Continue without Dodo customer - billing will be disabled
		}
	}

	// Create local customer record
	const customerId = createId();
	const customerData = {
		id: customerId,
		organizationId,
		dodoCustomerId,
		email: organization.email || `org-${organizationId}@kaamsync.com`,
		name: organization.name,
	};

	await db.insert(customersTable).values(customerData);

	return customerData;
}