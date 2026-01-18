import { type InferSelectModel, sql } from "drizzle-orm";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema";
import { planLimits } from "~/lib/billing/plans";

const planCache = new Map<string, { plan: string; expires: number }>();
const PLAN_CACHE_TTL = 300_000;

type OrgPlanRow = InferSelectModel<typeof organizationsTable>;

export async function getOrgPlanKey(orgId: string): Promise<string> {
	const cached = planCache.get(orgId);
	if (cached && cached.expires > Date.now()) {
		return cached.plan;
	}

	const result = await db
		.select({
			planKey: organizationsTable.planKey,
			validUntil: organizationsTable.planValidUntil,
		})
		.from(organizationsTable)
		.where(sql`id = ${orgId}`)
		.limit(1);

	const row = result[0];
	let plan = row?.planKey ?? "starter";
	const validUntil = row?.validUntil;

	if (validUntil && validUntil < new Date()) {
		plan = "starter";
	}

	planCache.set(orgId, { plan, expires: Date.now() + PLAN_CACHE_TTL });
	return plan;
}

export async function getOrgMatterCount(orgId: string): Promise<number> {
	const plan = await getOrgPlanKey(orgId);

	if (plan !== "starter") {
		return -1;
	}

	const result = await db
		.select({
			count: sql<number>`COALESCE((usage->>'matters')::int, 0)`,
		})
		.from(organizationsTable)
		.where(sql`id = ${orgId}`)
		.limit(1);

	return result[0]?.count ?? 0;
}

export async function adjustOrgMatterUsage(orgId: string, delta: number) {
	const plan = await getOrgPlanKey(orgId);

	if (plan !== "starter") return;

	await db
		.update(organizationsTable)
		.set({
			usage: sql`jsonb_set(
				COALESCE(usage, '{}'::jsonb),
				'{matters}',
				to_jsonb(GREATEST(0, COALESCE((usage->>'matters')::int, 0) + ${delta})),
				true
			)`,
		})
		.where(sql`id = ${orgId}`);

	invalidatePlanCache(orgId);
}

export async function canCreateMatter(orgId: string): Promise<boolean> {
	const plan = await getOrgPlanKey(orgId);

	if (plan !== "starter") {
		return true;
	}

	const limit = planLimits.starter.matters;
	const current = await getOrgMatterCount(orgId);

	return current < limit;
}

export function invalidatePlanCache(orgId: string) {
	planCache.delete(orgId);
}

export async function syncOrgPlanFromSubscription(
	orgId: string,
	planKey: string,
	validUntil: Date | null,
) {
	await db
		.update(organizationsTable)
		.set({
			planKey: sql`${planKey}`,
			planValidUntil: validUntil,
		})
		.where(sql`id = ${orgId}`);

	invalidatePlanCache(orgId);
}
