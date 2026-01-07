import { count, eq } from "drizzle-orm";
import { db } from "~/db";
import { customersTable, membersTable, subscriptionsTable } from "~/db/schema";
import {
	reportSeatCount,
	trackStorageUsage,
	trackTeamCreated,
} from "~/lib/billing";
import { invalidateUsageCache } from "~/lib/server/billing.server";
import { getOrCreateCustomer } from "~/lib/server/customer.server";

/**
 * Get the Dodo customer ID for an organization
 */
export async function getOrganizationCustomerId(
	organizationId: string,
): Promise<string | null> {
	const customer = await db.query.customersTable.findFirst({
		where: eq(customersTable.organizationId, organizationId),
	});
	return customer?.dodoCustomerId ?? null;
}

/**
 * Check if organization has an active subscription that supports usage metering
 */
export async function hasActiveSubscription(
	organizationId: string,
): Promise<boolean> {
	const subscription = await db.query.subscriptionsTable.findFirst({
		where: eq(subscriptionsTable.organizationId, organizationId),
	});
	return subscription?.status === "active";
}

/**
 * Sync current seat count to Dodo Payments
 * Call this on: member add, member remove, or periodically
 *
 * This reports the CURRENT seat count, not a delta.
 * Dodo uses Max aggregation to track peak usage in billing period.
 * Billing occurs at end of month with base subscription.
 */
export async function syncOrganizationSeats(
	organizationId: string,
): Promise<void> {
	try {
		// Use getOrCreateCustomer to ensure we have a record
		// This fixes the issue where new orgs don't have a customer record yet
		const customer = await getOrCreateCustomer(organizationId);
		const customerId = customer.dodoCustomerId;

		if (!customerId) {
			return;
		}

		const hasActive = await hasActiveSubscription(organizationId);
		if (!hasActive) {
			return;
		}

		// Get current member count
		const [result] = await db
			.select({ count: count() })
			.from(membersTable)
			.where(eq(membersTable.organizationId, organizationId));

		const currentSeats = result?.count ?? 0;

		const success = await reportSeatCount(customerId, currentSeats);
		if (!success) {
			console.warn(
				`[Billing] FAILED: reportSeatCount returned false for customer ${customerId}`,
			);
		}
	} catch (error) {
		console.error(
			`[Billing] FATAL ERROR syncing seats for ${organizationId}:`,
			error,
		);
		// Don't throw - billing tracking should not break member operations
	}
}

/**
 * Track membership changes (unified function for add/remove)
 * Called after invitation acceptance, direct member addition, or member removal
 * Syncs absolute seat count and invalidates cache
 */
export async function trackMembershipChange(
	organizationId: string,
): Promise<void> {
	// Invalidate usage cache first
	invalidateUsageCache(organizationId);

	await syncOrganizationSeats(organizationId);
}

/**
 * Track when a new team is created
 * Called after team creation in Zero mutators (via server action)
 */
export async function trackNewTeam(organizationId: string): Promise<void> {
	try {
		const customerId = await getOrganizationCustomerId(organizationId);
		if (!customerId) {
			console.log(
				"[Billing] No customer found for org, skipping team tracking",
			);
			return;
		}

		const hasActive = await hasActiveSubscription(organizationId);
		if (!hasActive) {
			console.log("[Billing] No active subscription, skipping team tracking");
			return;
		}

		const success = await trackTeamCreated(customerId);
		if (success) {
			console.log("[Billing] Successfully tracked new team");
		} else {
			console.warn("[Billing] Failed to track team creation");
		}
	} catch (error) {
		console.error("[Billing] Error tracking team:", error);
	}
}

/**
 * Track storage usage for an organization
 * Call this periodically or after file uploads
 * @param organizationId - The organization ID
 * @param gbUsed - Total storage used in GB
 */
export async function trackOrgStorage(
	organizationId: string,
	gbUsed: number,
): Promise<void> {
	try {
		const customerId = await getOrganizationCustomerId(organizationId);
		if (!customerId) {
			console.log(
				"[Billing] No customer found for org, skipping storage tracking",
			);
			return;
		}

		const hasActive = await hasActiveSubscription(organizationId);
		if (!hasActive) {
			console.log(
				"[Billing] No active subscription, skipping storage tracking",
			);
			return;
		}

		const success = await trackStorageUsage(customerId, gbUsed);
		if (success) {
			console.log(`[Billing] Successfully tracked ${gbUsed}GB storage usage`);
		} else {
			console.warn("[Billing] Failed to track storage usage");
		}
	} catch (error) {
		console.error("[Billing] Error tracking storage:", error);
	}
}
