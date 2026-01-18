import DodoPayments from "dodopayments";
import type { WebhookPayload } from "dodopayments/resources/webhook-events.mjs";
import { and, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { organizationsTable, subscriptionsTable } from "~/db/schema";
import { type ProductKey, planLimits, usagePricing } from "~/lib/billing/plans";
import { env } from "~/lib/config/env-validation.server";
import {
	getOrganizationMemberCount,
	getOrganizationTeamCount,
	getOrganizationUsagePrepared,
	// getOrganizationCustomer as getOrgCustomerPrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/server/prepared-queries.server";
import {
	getOrgMatterCount,
	getOrgPlanKey,
	invalidatePlanCache,
} from "./usage-check.server";

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
}

async function getMemberCount(orgId: string) {
	const result = await getOrganizationMemberCount.execute({
		organizationId: orgId,
	});
	return result[0]?.count ?? 0;
}

async function getTeamCount(orgId: string) {
	const result = await getOrganizationTeamCount.execute({ orgId });
	return result[0]?.count ?? 0;
}

export async function getOrganizationUsage(orgId: string): Promise<PlanUsage> {
	return await getOrganizationUsagePrepared(orgId);
}

export function invalidateUsageCache(orgId: string) {
	invalidatePlanCache(orgId);
}

export function invalidateAllOrganizationCaches(orgId: string) {
	invalidatePlanCache(orgId);
}

export function getCacheStats() {
	return { usageCache: 0 };
}

// Server-only DodoPayments client and billing config
export const dodoPayments = env.DODO_PAYMENTS_API_KEY
	? new DodoPayments({
			bearerToken: env.DODO_PAYMENTS_API_KEY,
			environment:
				(env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") ??
				"test_mode",
		})
	: null;

export const billingConfig = {
	webhookSecret: env.DODO_PAYMENTS_WEBHOOK_SECRET,
	enabled: !!(env.DODO_PAYMENTS_API_KEY && env.DODO_PAYMENTS_WEBHOOK_SECRET),
	successUrl: `${env.SITE_URL}/api/billing/redirect?success=true`,
} as const;

// =============================================================================
// REPOSITORY
// =============================================================================

export async function getOrganizationSubscription(
	orgId: string,
	customerId: string,
) {
	const result = await getOrgSubscriptionPrepared.execute({
		organizationId: orgId,
		billingCustomerId: customerId,
		status: "active",
	});
	return result[0] ?? null;
}

export async function getOrganizationCustomer(orgId: string) {
	// 1. Try direct lookup in customersTable
	// const directResult = await getOrgCustomerPrepared.execute({
	// 	organizationId: orgId,
	// });

	// if directResult[0]) return directResult[0];

	// 2. Fallback: Lookup via subscriptionsTable (for multi-org customers)
	// await getOrganizationSubscription(orgId);
	// if (sub?.customerId) {
	// 	const customer = await db.query.customersTable.findFirst({
	// 		where: eq(customersTable.id, sub.customerId),
	// 	});
	// 	if (customer) return customer;
	// }

	return null;
}

export async function upsertSubscription(
	customerId: string,
	orgId: string,
	payload: WebhookPayload.Subscription,
	status: string,
) {
	const planKey = payload.product_id
		? getPlanByProductId(payload.product_id)
		: null;

	const data = {
		customerId,
		organizationId: orgId,
		dodoSubscriptionId: payload.subscription_id,
		productId: payload.product_id ?? "",
		planKey,
		status,
		billingInterval: payload.payment_frequency_interval?.toLowerCase(),
		amount: payload.recurring_pre_tax_amount,
		currency: payload.currency,
		currentPeriodEnd: payload.next_billing_date
			? new Date(payload.next_billing_date)
			: null,
		cancelledAt: payload.cancelled_at ? new Date(payload.cancelled_at) : null,
	};

	await db.transaction(async (tx) => {
		let existing = payload.subscription_id
			? await tx.query.subscriptionsTable.findFirst({
					where: eq(
						subscriptionsTable.billingSubscriptionId,
						payload.subscription_id,
					),
				})
			: null;

		if (!existing) {
			existing = await tx.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.organizationId, orgId),
					eq(subscriptionsTable.billingCustomerId, customerId),
					eq(subscriptionsTable.productId, data.productId),
					eq(subscriptionsTable.status, "active"),
				),
				orderBy: (s, { desc }) => desc(s.createdAt),
			});
		}

		if (existing) {
			await tx
				.update(subscriptionsTable)
				.set(data)
				.where(eq(subscriptionsTable.id, existing.id));
		} else {
			// await tx.insert(subscriptionsTable).values({ id: createId(), ...data });
		}
	});
}

export interface PlanLimitCheck {
	withinLimits: boolean;
	usage: PlanUsage;
	effectivePlan: ProductKey;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		matters?: { current: number; limit: number };
	};
}

function hasSubscriptionEnded(sub: {
	status?: string | null;
	currentPeriodEnd?: string | Date | null;
}): boolean {
	if (sub?.status !== "cancelled" && sub?.status !== "expired") return false;
	if (!sub?.currentPeriodEnd) return false;
	return new Date(sub.currentPeriodEnd) < new Date();
}

export async function getOrganizationPlanKey(
	orgId: string,
): Promise<ProductKey> {
	return (await getOrgPlanKey(orgId)) as ProductKey;
}

export async function checkPlanLimits(
	orgId: string,
	overridePlan?: ProductKey,
): Promise<PlanLimitCheck> {
	const effectivePlan = overridePlan ?? (await getOrgPlanKey(orgId));

	const usage = {
		members: await getMemberCount(orgId),
		teams: await getTeamCount(orgId),
		matters: await getOrgMatterCount(orgId),
	};

	const limits = planLimits[effectivePlan];
	const violations: PlanLimitCheck["violations"] = {};
	let withinLimits = true;

	if (limits.members !== -1 && usage.members > limits.members) {
		violations.members = { current: usage.members, limit: limits.members };
		withinLimits = false;
	}
	if (limits.teams !== -1 && usage.teams > limits.teams) {
		violations.teams = { current: usage.teams, limit: limits.teams };
		withinLimits = false;
	}
	if (limits.matters !== -1 && usage.matters > limits.matters) {
		violations.matters = { current: usage.matters, limit: limits.matters };
		withinLimits = false;
	}

	return { withinLimits, usage, effectivePlan, limits, violations };
}

export async function canAddMember(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);
	if (limits.members === -1)
		return { allowed: true, currentCount: usage.members, limit: -1 };
	if (usage.members >= limits.members) {
		const sub = await getOrganizationSubscription(orgId);
		const isActivePaid =
			sub?.status === "active" && effectivePlan !== "starter";
		if (isActivePaid)
			return {
				allowed: true,
				currentCount: usage.members,
				limit: limits.members,
				isOverage: true,
				message: "Adding this member will cost extra.",
			};
		return {
			allowed: false,
			reason: `Member limit (${limits.members}) reached. Upgrade to add more.`,
			currentCount: usage.members,
			limit: limits.members,
			isOverage: true,
		};
	}
	return {
		allowed: true,
		currentCount: usage.members,
		limit: limits.members,
		isOverage: false,
		message: "This member is included in your plan",
	};
}

export async function canCreateTeam(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);
	if (limits.teams === -1)
		return { allowed: true, currentCount: usage.teams, limit: -1 };
	if (usage.teams >= limits.teams) {
		const sub = await getOrganizationSubscription(orgId);
		if (
			sub?.status === "active" &&
			(effectivePlan === "growth" || effectivePlan === "pro")
		) {
			return {
				allowed: true,
				currentCount: usage.teams,
				limit: limits.teams,
				isOverage: true,
			};
		}
		return {
			allowed: false,
			reason: `Team limit (${limits.teams}) reached. Upgrade to add more.`,
			currentCount: usage.teams,
			limit: limits.teams,
		};
	}
	return { allowed: true, currentCount: usage.teams, limit: limits.teams };
}

export async function canCreateMatter(orgId: string) {
	const { usage, limits } = await checkPlanLimits(orgId);
	if (limits.matters === -1)
		return { allowed: true, currentCount: usage.matters, limit: -1 };
	if (usage.matters >= limits.matters)
		return {
			allowed: false,
			reason: `Matter limit (${limits.matters}) reached. Upgrade for unlimited.`,
			currentCount: usage.matters,
			limit: limits.matters,
		};
	return { allowed: true, currentCount: usage.matters, limit: limits.matters };
}

export async function handleSubscriptionDowngrade(
	orgId: string,
	newPlan: ProductKey,
) {
	const check = await checkPlanLimits(orgId, newPlan);
	if (!check.withinLimits) {
		const msgs: string[] = [];
		if (check.violations.members)
			msgs.push(
				`Remove ${check.violations.members.current - check.violations.members.limit} members`,
			);
		if (check.violations.teams)
			msgs.push(
				`Remove ${check.violations.teams.current - check.violations.teams.limit} teams`,
			);
		if (check.violations.matters)
			msgs.push(
				`Remove ${check.violations.matters.current - check.violations.matters.limit} matters`,
			);
		return {
			canDowngrade: false,
			violations: check.violations,
			message: `To downgrade to ${newPlan}: ${msgs.join(", ")}`,
		};
	}
	return { canDowngrade: true, violations: {} };
}

export const getMemberProductSlug = (plan: string) =>
	`member-add-${plan === "growth" || plan === "pro" ? plan : "starter"}`;
export const getMemberPrice = (plan: string) =>
	plan === "growth" || plan === "pro"
		? usagePricing[plan as "growth" | "pro"].memberSeat
		: 500;

export async function getBillingStatus(orgId: string) {
	const [memberCheck, teamCheck, matterCheck, usage] = await Promise.all([
		canAddMember(orgId),
		canCreateTeam(orgId),
		canCreateMatter(orgId),
		getOrganizationUsage(orgId),
	]);
	const planKey = await getOrganizationPlanKey(orgId);
	const limits = planLimits[planKey];
	const teamPriceCents =
		planKey === "growth" || planKey === "pro"
			? usagePricing[planKey].teamCreated
			: null;

	return {
		plan: planKey,
		limits,
		usage,
		members: {
			allowed: memberCheck.allowed,
			requiresPayment: memberCheck.isOverage ?? false,
			message: memberCheck.message,
			priceCents: getMemberPrice(planKey),
			current: usage.members,
			limit: limits.members,
		},
		teams: {
			allowed: teamCheck.allowed,
			requiresPayment: teamCheck.isOverage ?? false,
			message: teamCheck.allowed ? null : teamCheck.reason,
			priceCents: teamPriceCents,
			current: usage.teams,
			limit: limits.teams,
		},
		matters: {
			allowed: matterCheck.allowed,
			message: matterCheck.reason ?? null,
			current: matterCheck.currentCount,
			limit: limits.matters,
			remaining:
				limits.matters === -1 ? -1 : limits.matters - matterCheck.currentCount,
		},
	};
}

export const getPlanByProductId = (productId?: string): ProductKey | null => {
	if (!productId) return "starter";
	const {
		DODO_PRODUCT_GROWTH_MONTHLY,
		DODO_PRODUCT_GROWTH_YEARLY,
		DODO_PRODUCT_PROFESSIONAL_MONTHLY,
		DODO_PRODUCT_PROFESSIONAL_YEARLY,
	} = env;
	if (
		productId === DODO_PRODUCT_GROWTH_MONTHLY ||
		productId === DODO_PRODUCT_GROWTH_YEARLY
	)
		return "growth";
	if (
		productId === DODO_PRODUCT_PROFESSIONAL_MONTHLY ||
		productId === DODO_PRODUCT_PROFESSIONAL_YEARLY
	)
		return "pro";
	return "starter";
};
