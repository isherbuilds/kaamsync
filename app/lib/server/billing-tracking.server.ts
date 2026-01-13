/**
 * Billing Tracking - Server-side usage metering
 * Tracks seat counts, storage, and other usage metrics for billing
 */
import { dodoPayments } from "~/lib/billing";
import { invalidateUsageCache } from "~/lib/server/billing.server";
import { getOrganizationMemberCount } from "~/lib/server/organization.server";
import { getOrganizationStorageUsage } from "~/lib/server/storage.server";

/**
 * Track membership changes - invalidates cache and reports seat count
 */
export async function trackMembershipChange(
	organizationId: string,
): Promise<void> {
	invalidateUsageCache(organizationId);
	await reportSeatCount(organizationId);
}

/**
 * Track storage changes - reports storage usage to billing
 */
export async function trackStorageChange(
	organizationId: string,
): Promise<void> {
	await reportStorageUsage(organizationId);
}

/**
 * Report current seat count to DodoPayments usage metering
 */
async function reportSeatCount(organizationId: string): Promise<void> {
	if (!dodoPayments) return;

	try {
		const memberCount = await getOrganizationMemberCount(organizationId);

		await dodoPayments.usageEvents.ingest({
			events: [
				{
					event_id: `seat_count_${organizationId}_${Date.now()}`,
					customer_id: organizationId,
					event_name: "seat_count",
					timestamp: new Date().toISOString(),
					metadata: {
						organization_id: organizationId,
						seat_count: memberCount,
					},
				},
			],
		});

		console.log(
			`[Billing] Reported seat count: ${memberCount} for org ${organizationId}`,
		);
	} catch (error) {
		console.error("[Billing] Failed to report seat count:", error);
	}
}

/**
 * Report storage usage to DodoPayments for billing
 */
async function reportStorageUsage(organizationId: string): Promise<void> {
	if (!dodoPayments) return;

	try {
		const usage = await getOrganizationStorageUsage(organizationId);

		await dodoPayments.usageEvents.ingest({
			events: [
				{
					event_id: `storage_${organizationId}_${Date.now()}`,
					customer_id: organizationId,
					event_name: "storage_usage",
					timestamp: new Date().toISOString(),
					metadata: {
						organization_id: organizationId,
						storage_bytes: usage.totalBytes,
						storage_gb: Math.round(usage.totalGb * 100) / 100,
						file_count: usage.fileCount,
					},
				},
			],
		});

		console.log(
			`[Billing] Reported storage: ${usage.totalGb.toFixed(2)}GB (${usage.fileCount} files) for org ${organizationId}`,
		);
	} catch (error) {
		console.error("[Billing] Failed to report storage usage:", error);
	}
}
