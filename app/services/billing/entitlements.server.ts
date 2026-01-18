import { eq } from "drizzle-orm";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema/auth-schema";
import { type ProductKey, planLimits } from "~/lib/billing/plans";
import { UsageService } from "./usage.server";

export class EntitlementService {
	/**
	 * Resolves the effective limit for a resource, considering:
	 * 1. Manual Overrides (org_limits table)
	 * 2. Plan Defaults (plans.ts)
	 */
	static async getLimit(
		orgId: string,
		resource: keyof (typeof planLimits)["starter"],
	) {
		// 1. Check for manual override first
		const override = await db.query.orgLimitsTable.findFirst({
			where: (limits, { and, eq }) =>
				and(eq(limits.orgId, orgId), eq(limits.metric, resource)),
		});

		if (override) {
			return override.value;
		}

		// 2. Fallback to plan limit
		const org = await db.query.organizationsTable.findFirst({
			where: eq(organizationsTable.id, orgId),
			columns: { planKey: true },
		});

		const planKey = (org?.planKey as ProductKey) || "starter";
		const limits = planLimits[planKey] || planLimits.starter;
		return limits[resource];
	}

	static async check(
		orgId: string,
		resource: keyof (typeof planLimits)["starter"],
	) {
		const limit = await EntitlementService.getLimit(orgId, resource);

		if (limit === -1) return { allowed: true };

		if (resource === "maxFileSizeMb" || resource === "maxFiles") {
			if (resource === "maxFiles") {
				const currentFiles = await UsageService.getMetric(orgId, "files");
				if (currentFiles >= limit) {
					return {
						allowed: false,
						reason: `File count limit reached: ${currentFiles}/${limit}`,
					};
				}
				return { allowed: true };
			}
			return { allowed: true };
		}

		let metricKey = resource as string;
		if (resource === "storageGb") {
			metricKey = "storage_bytes";
		}

		const currentUsage = await UsageService.getMetric(orgId, metricKey);

		if (resource === "storageGb") {
			const limitBytes = limit * 1024 * 1024 * 1024;
			if (currentUsage >= limitBytes) {
				return {
					allowed: false,
					reason: `Storage limit reached: ${(
						currentUsage / 1024 / 1024 / 1024
					).toFixed(2)}GB / ${limit}GB`,
				};
			}
		} else {
			if (currentUsage >= limit) {
				return {
					allowed: false,
					reason: `Limit reached: ${currentUsage}/${limit} for ${resource}`,
				};
			}
		}

		return { allowed: true };
	}
}
