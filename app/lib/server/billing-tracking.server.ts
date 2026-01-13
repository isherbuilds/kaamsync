/**
 * Billing Tracking - Server-side usage metering
 * Tracks seat counts, storage, and other usage metrics for billing
 */
import {
	dodoPayments,
	invalidateUsageCache,
} from "~/lib/server/billing.server";
import { getOrganizationMemberCount } from "~/lib/server/organization.server";
import { getOrganizationStorageUsage } from "~/lib/server/storage.server";

/**
 * Report current seat count to DodoPayments usage metering
 */
export async function reportSeatCount(organizationId: string) {
	if (!dodoPayments) return;

	try {
		invalidateUsageCache(organizationId);

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
export async function reportStorageUsage(organizationId: string) {
	if (!dodoPayments) return;

	try {
		invalidateUsageCache(organizationId);

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
