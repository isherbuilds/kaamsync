import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { customersTable, organizationsTable } from "~/db/schema";
import { dodoPayments } from "~/lib/server/billing.server";
import {
	getOrganizationCustomer,
	getOrganizationOwnerUser,
} from "~/lib/server/prepared-queries.server";

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
	// Check if customer already exists (use prepared statement)
	const existingCustomerResult = await getOrganizationCustomer.execute({
		organizationId,
	});
	const existingCustomer = existingCustomerResult[0] ?? null;
	if (existingCustomer) return existingCustomer;

	// Fetch organization and owner in parallel
	const [organization, ownerResult] = await Promise.all([
		db.query.organizationsTable.findFirst({
			where: eq(organizationsTable.id, organizationId),
		}),
		getOrganizationOwnerUser.execute({ organizationId, role: "owner" }),
	]);

	if (!organization) {
		throw new Error("Organization not found");
	}

	const ownerUser = ownerResult[0]?.user ?? null;

	// Resolve email: prefer owner -> organization.metadata -> fallback
	let resolvedEmail: string | null = ownerUser?.email ?? null;
	if (!resolvedEmail && organization.metadata) {
		try {
			const meta = JSON.parse(organization.metadata);
			if (meta?.email && typeof meta.email === "string") {
				resolvedEmail = meta.email;
			}
		} catch (err) {
			// ignore parse errors
		}
	}

	const emailToUse = resolvedEmail || "billing-fallback@kaamsync.com";

	// Create customer in Dodo Payments if billing is enabled
	let dodoCustomerId: string | null = null;
	if (dodoPayments) {
		try {
			const dodoCustomer = await dodoPayments.customers.create({
				email: emailToUse,
				name: organization.name,
				metadata: {
					organization_id: organizationId,
					source: "kaamsync",
				},
			});
			dodoCustomerId = dodoCustomer.customer_id;
		} catch (error) {
			console.error("[Customer] Failed to create Dodo customer:", error);
			// Continue without Dodo customer - dodoCustomerId will be null
		}
	}

	// Create local customer record
	const customerId = createId();
	const customerData = {
		id: customerId,
		organizationId,
		dodoCustomerId,
		email: emailToUse,
		name: organization.name,
	};

	await db.insert(customersTable).values(customerData).onConflictDoNothing();

	// Re-fetch to handle race condition - another request may have inserted first
	const finalCustomerResult = await getOrganizationCustomer.execute({
		organizationId,
	});
	const finalCustomer = finalCustomerResult[0];
	if (finalCustomer) return finalCustomer;

	// This should not happen if unique constraint exists
	throw new Error("Failed to create or retrieve customer");
}
