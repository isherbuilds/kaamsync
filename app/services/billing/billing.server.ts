import DodoPayments from "dodopayments";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { subscriptionsTable } from "~/db/schema";
import { type ProductKey, products } from "~/lib/billing/plans";
import { UsageService } from "./usage.server";

let dodoClient: DodoPayments | null = null;

export class BillingService {
	static getClient() {
		if (dodoClient) return dodoClient;
		if (!process.env.DODO_PAYMENTS_API_KEY) return null;

		dodoClient = new DodoPayments({
			bearerToken: process.env.DODO_PAYMENTS_API_KEY,
			environment:
				process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
		});
		return dodoClient;
	}

	static async reportUsage(orgId: string) {
		const client = BillingService.getClient();
		if (!client) return;

		const sub = await db.query.subscriptionsTable.findFirst({
			where: eq(subscriptionsTable.organizationId, orgId),
			columns: { billingCustomerId: true },
		});

		if (!sub?.billingCustomerId) return;

		const usage = await UsageService.getUsage(orgId);

		if (usage.members !== undefined) {
			await client.usageEvents.ingest({
				events: [
					{
						event_id: `seat_${orgId}_${Date.now()}`,
						customer_id: sub.billingCustomerId,
						event_name: "seat_count",
						timestamp: new Date().toISOString(),
						metadata: {
							organization_id: orgId,
							seat_count: String(usage.members),
						},
					},
				],
			});
		}

		if (usage.storage_bytes !== undefined) {
			const storageGb = usage.storage_bytes / (1024 * 1024 * 1024);
			await client.usageEvents.ingest({
				events: [
					{
						event_id: `storage_${orgId}_${Date.now()}`,
						customer_id: sub.billingCustomerId,
						event_name: "storage_usage",
						timestamp: new Date().toISOString(),
						metadata: {
							organization_id: orgId,
							storage_bytes: String(usage.storage_bytes),
							storage_gb: String(storageGb.toFixed(2)),
						},
					},
				],
			});
		}
	}

	static mapProductIdToPlanKey(productId: string): ProductKey {
		for (const [key, product] of Object.entries(products)) {
			if (typeof product.slug === "string") {
				if (product.slug === productId) return key as ProductKey;
			} else {
				if (
					product.slug.monthly === productId ||
					product.slug.yearly === productId
				) {
					return key as ProductKey;
				}
			}
		}
		return "starter";
	}
}
