/**
 * Billing Tracking - Server-side usage metering
 * Tracks seat counts, storage, and other usage metrics for billing
 */
import { dodoPayments } from "~/lib/billing/service";
import { getOrganizationMemberCount } from "~/lib/organization/service";
import { getOrganizationStorageUsage } from "~/lib/storage/service";
import { logger } from "~/lib/utils/logger";

/**
 * Report current seat count to DodoPayments usage metering
 */
export async function reportSeatCount(organizationId: string) {
	if (!dodoPayments) return;

	try {
		const [memberCount] = await Promise.all([
			getOrganizationMemberCount(organizationId),
		]);

		await dodoPayments.usageEvents.ingest({
			events: [
				{
					event_id: `seat_count_${organizationId}_${Date.now()}`,
					customer_id: dodoCustomerId || "",
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
export async function reportStorageUsage(orgId: string) {
	if (!dodoPayments) return;

	try {
		const [usage, customer] = await Promise.all([
			getOrganizationStorageUsage(orgId),
		]);

		const dodoCustomerId = customer?.dodoCustomerId;

		if (!dodoCustomerId) {
			logger.error(
				`[Storage] Skipping Dodo usage ingest: no Dodo customer found for org ${orgId}`,
			);
			return;
		}

		await dodoPayments.usageEvents.ingest({
			events: [
				{
					event_id: `storage_${orgId}_${Date.now()}`,
					customer_id: dodoCustomerId,
					event_name: "storage_usage",
					timestamp: new Date().toISOString(),
					metadata: {
						organization_id: orgId,
						storage_bytes: usage.totalBytes,
						storage_gb: Math.round(usage.totalGb * 100) / 100,
						file_count: usage.fileCount,
					},
				},
			],
		});

		logger.log(
			`[Storage] Reported usage: ${usage.totalGb.toFixed(2)}GB (${usage.fileCount} files) for org ${orgId}`,
		);
	} catch (error) {
		logger.error("[Storage] Failed to report usage:", error);
	}
}
