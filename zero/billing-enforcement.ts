/**
 * Zero billing enforcement module
 * Provides limit checking and usage tracking for Zero mutators
 * All functions work with Zero transaction objects (tx)
 */

import type { ProductKey } from "~/lib/billing/plans";
import { planLimits } from "~/lib/billing/plans";

// =============================================================================
// TYPES
// =============================================================================

export type OverageHandling = "block" | "allow" | "allow_with_warning";

export interface EnforceOptions {
	orgId: string;
	resource: "member" | "team" | "matter" | "storage";
	quantity?: number;
	allowOverage?: OverageHandling;
}

export interface CheckLimitsResult {
	allowed: boolean;
	remaining: number;
	reason?: string;
	warning?: string;
	overage?: boolean;
}

// =============================================================================
// LIMIT CHECKING
// =============================================================================

/**
 * Get organization plan from Zero transaction
 */
async function getOrgPlan(tx: any, orgId: string): Promise<ProductKey> {
	const org = await tx.run(
		tx.query.organizationsTable.where("id", orgId).one(),
	);
	const planKey = org?.planKey ?? "starter";
	const validUntil = org?.planValidUntil;

	if (validUntil && new Date(validUntil) < new Date()) {
		return "starter";
	}

	return planKey as ProductKey;
}

/**
 * Get organization usage from Zero transaction
 */
async function getOrgUsage(
	tx: any,
	orgId: string,
): Promise<{
	members: number;
	teams: number;
	matters: number;
}> {
	try {
		const usageRows = await tx.run(
			tx.query.usageCacheTable.where("orgId", orgId).many(),
		);

		if (usageRows.length > 0) {
			const usage = { members: 0, teams: 0, matters: 0 };
			for (const row of usageRows) {
				if (row.metric === "members") usage.members = row.count ?? 0;
				if (row.metric === "teams") usage.teams = row.count ?? 0;
				if (row.metric === "matters") usage.matters = row.count ?? 0;
			}
			return usage;
		}
	} catch (_e) {}

	const [members, teams, matters] = await Promise.all([
		tx.run(tx.query.membersTable.where("organizationId", orgId).length()),
		tx.run(tx.query.teamsTable.where("orgId", orgId).length()),
		tx.run(
			tx.query.mattersTable
				.where("orgId", orgId)
				.whereNull("deletedAt")
				.length(),
		),
	]);

	return {
		members: members ?? 0,
		teams: teams ?? 0,
		matters: matters ?? 0,
	};
}

/**
 * Check if resource is overage-allowed based on plan limits
 */
function getOverageLimit(
	limits: (typeof planLimits)[ProductKey],
	resource: "member" | "team" | "matter" | "storage",
): { limit: number; overageAllowed: boolean } {
	const limitField =
		resource === "storage"
			? "storageGb"
			: (`${resource}s` as keyof typeof limits);
	const limit = limits[limitField] as number;
	const overageAllowed =
		(limits.members as number) === -1 ||
		(limits.teams as number) === -1 ||
		(limits.matters as number) === -1 ||
		(limits.storageGb as number) === -1;

	return {
		limit,
		overageAllowed,
	};
}

/**
 * Check limits with configuration
 */
export async function checkLimitsWithConfig(
	tx: any,
	options: EnforceOptions,
	config?: Partial<{
		overageHandling: OverageHandling;
		allowDowngradeViolation: boolean;
		gracePeriodDays: number;
	}>,
): Promise<CheckLimitsResult> {
	const { orgId, resource, quantity = 1, allowOverage = "block" } = options;
	const overageHandling = config?.overageHandling ?? "block";

	const planKey = await getOrgPlan(tx, orgId);
	const limits = planLimits[planKey];
	const usage = await getOrgUsage(tx, orgId);
	const { limit, overageAllowed } = getOverageLimit(limits, resource);

	const resourceKey = `${resource}s` as keyof typeof usage;
	const currentUsage = usage[resourceKey] ?? 0;
	const newUsage = currentUsage + quantity;

	if (newUsage <= limit || overageAllowed) {
		return {
			allowed: true,
			remaining: limit === -1 ? -1 : limit - newUsage,
		};
	}

	if (overageHandling === "block") {
		return {
			allowed: false,
			reason: `${resource} limit (${limit}) reached`,
			remaining: limit === -1 ? -1 : limit - currentUsage,
		};
	}

	if (overageHandling === "allow" || overageHandling === "allow_with_warning") {
		if (newUsage > limit) {
			const overage = newUsage - limit;
			return {
				allowed: true,
				remaining: limit === -1 ? -1 : limit - newUsage,
				warning: `Overage: ${overage} ${resource}(s). Additional charges will apply.`,
				overage: true,
			};
		}

		return {
			allowed: true,
			remaining: limit === -1 ? -1 : limit - newUsage,
		};
	}

	return {
		allowed: true,
		remaining: limit === -1 ? -1 : limit - currentUsage,
		overage: true,
	};
}

/**
 * Assert that operation is within limits
 */
export async function assertWithinLimitsWithConfig(
	tx: any,
	options: EnforceOptions,
	config?: Partial<{
		overageHandling: OverageHandling;
		allowDowngradeViolation: boolean;
		gracePeriodDays: number;
	}>,
): Promise<void> {
	const result = await checkLimitsWithConfig(tx, options, config);

	if (!result.allowed) {
		throw new Error(result.reason ?? "Limit exceeded");
	}
}

// =============================================================================
// USAGE TRACKING
// =============================================================================

/**
 * Increment usage counter for a resource
 * Note: This is a stub - in production, you'd update a usage cache table
 */
export async function incrementUsage(
	tx: any,
	orgId: string,
	type: "member" | "team" | "matter" | "storage",
	quantity: number = 1,
): Promise<void> {
	let metric = type === "member" ? "members" : `${type}s`;
	if (type === "storage") metric = "storage_bytes";

	try {
		const row = await tx.run(
			tx.query.usageCacheTable
				.where("orgId", orgId)
				.where("metric", metric)
				.one(),
		);

		if (row) {
			await tx.mutate.usageCacheTable.update({
				orgId,
				metric,
				count: (row.count ?? 0) + quantity,
				updatedAt: Date.now(),
			});
		} else {
			await tx.mutate.usageCacheTable.insert({
				orgId,
				metric,
				count: quantity,
				updatedAt: Date.now(),
			});
		}
	} catch (_e) {}
}

export async function decrementUsage(
	tx: any,
	orgId: string,
	type: "member" | "team" | "matter" | "storage",
	quantity: number = 1,
): Promise<void> {
	await incrementUsage(tx, orgId, type, -quantity);
}

// =============================================================================
// ASSERTION HELPERS (for use in mutators)
// =============================================================================

/**
 * Assert that member can be added
 */
export async function assertCanAddMember(
	tx: any,
	orgId: string,
): Promise<void> {
	await assertWithinLimitsWithConfig(tx, {
		orgId,
		resource: "member",
		quantity: 1,
		allowOverage: "block",
	});
}

/**
 * Assert that team can be created
 */
export async function assertCanCreateTeam(
	tx: any,
	orgId: string,
): Promise<void> {
	await assertWithinLimitsWithConfig(tx, {
		orgId,
		resource: "team",
		quantity: 1,
		allowOverage: "block",
	});
}

/**
 * Assert that matter can be created
 */
export async function assertCanCreateMatter(
	tx: any,
	orgId: string,
): Promise<void> {
	await assertWithinLimitsWithConfig(tx, {
		orgId,
		resource: "matter",
		quantity: 1,
		allowOverage: "block",
	});
}
