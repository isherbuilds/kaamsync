import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { usageCacheTable, usageLedgerTable } from "~/db/schema/billing-schema";

export class UsageService {
	static async increment(
		orgId: string,
		metric: string,
		delta: number,
		reason: string,
		metadata?: Record<string, unknown>,
	) {
		return db.transaction(async (tx) => {
			await tx.insert(usageLedgerTable).values({
				id: createId(),
				orgId,
				metric,
				delta,
				reason,
				metadata: metadata ? JSON.stringify(metadata) : null,
			});

			await tx
				.insert(usageCacheTable)
				.values({
					orgId,
					metric,
					count: delta,
				})
				.onConflictDoUpdate({
					target: [usageCacheTable.orgId, usageCacheTable.metric],
					set: {
						count: sql`${usageCacheTable.count} + ${delta}`,
						updatedAt: new Date(),
					},
				});
		});
	}

	static async getUsage(orgId: string) {
		const results = await db
			.select()
			.from(usageCacheTable)
			.where(eq(usageCacheTable.orgId, orgId));

		const usageMap: Record<string, number> = {};
		for (const row of results) {
			usageMap[row.metric] = row.count;
		}
		return usageMap;
	}

	static async getMetric(orgId: string, metric: string): Promise<number> {
		const result = await db
			.select({ count: usageCacheTable.count })
			.from(usageCacheTable)
			.where(
				eq(usageCacheTable.orgId, orgId) && eq(usageCacheTable.metric, metric),
			)
			.limit(1);

		return result[0]?.count ?? 0;
	}
}
