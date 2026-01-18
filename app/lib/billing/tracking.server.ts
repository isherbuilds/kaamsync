/**
 * Billing Tracking - Server-side usage metering
 * Tracks seat counts, storage, and other usage metrics for billing
 */
import {
	dodoPayments,
	getOrganizationCustomer,
	getOrganizationPlanKey,
} from "~/lib/billing/billing.server";
import { getOrganizationStorageUsage } from "~/lib/infra/storage.server";
import { getOrganizationMemberCount } from "~/lib/server/organization.server";
import { logger } from "../logging/logger";

/**
 * Report current seat count to DodoPayments usage metering
 * Fire-and-forget pattern for non-blocking user experience
 */
export function reportSeatCount(organizationId: string): void {
	if (!dodoPayments) return;

	(async () => {
		try {
			const [memberCount, _customer] = await Promise.all([
				getOrganizationMemberCount(organizationId),
				getOrganizationCustomer(organizationId),
			]);

			const dodoCustomerId = "";

			if (!dodoCustomerId) {
				const plan = await getOrganizationPlanKey(organizationId);
				if (plan === "starter") return;

				logger.warn(
					`[Billing] Skipping Dodo usage ingest: no Dodo customer found for organization ${organizationId} on ${plan} plan`,
				);
				return;
			}

			await dodoPayments.usageEvents.ingest({
				events: [
					{
						event_id: `seat_count_${organizationId}_${Date.now()}`,
						customer_id: dodoCustomerId,
						event_name: "seat_count",
						metadata: {
							organization_id: organizationId,
							seat_count: String(memberCount),
						},
						timestamp: new Date().toISOString(),
					},
				],
			});

			logger.info(
				`[Billing] Reported seat count: ${memberCount} for org ${organizationId} to Dodo`,
			);
		} catch (error) {
			logger.error("[Billing] Failed to report seat count:", error);
		}
	})();
}

/**
 * Report storage usage to DodoPayments for billing
 */
export async function reportStorageUsage(orgId: string) {
	if (!dodoPayments) return;

	try {
		const [usage, _customer] = await Promise.all([
			getOrganizationStorageUsage(orgId),
			getOrganizationCustomer(orgId),
		]);

		const dodoCustomerId = "";

		if (!dodoCustomerId) {
			const plan = await getOrganizationPlanKey(orgId);
			if (plan === "starter") return;

			logger.warn(
				`[Storage] Skipping Dodo usage ingest: no Dodo customer found for organization ${orgId} on ${plan} plan`,
			);
			return;
		}

		await dodoPayments.usageEvents.ingest({
			events: [
				{
					event_id: `storage_${orgId}_${Date.now()}`,
					customer_id: dodoCustomerId,
					event_name: "storage_usage",
					metadata: {
						organization_id: orgId,
						storage_bytes: String(usage.totalBytes),
						storage_gb: String(Math.round(usage.totalGb * 100) / 100),
						file_count: String(usage.fileCount),
					},
					timestamp: new Date().toISOString(),
				},
			],
		});

		logger.info(
			`[Storage] Reported usage: ${usage.totalGb.toFixed(2)}GB (${usage.fileCount} files) for org ${orgId} to Dodo`,
		);
	} catch (error) {
		logger.error("[Storage] Failed to report usage:", error);
	}
}
