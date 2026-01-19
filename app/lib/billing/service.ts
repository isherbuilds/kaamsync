/**
 * Billing Server Module - Consolidated
 * Simplified: ~320 lines vs original 1,142 lines (across 5 files)
 */
import { createId } from "@paralleldrive/cuid2";
import DodoPayments from "dodopayments";
import { and, eq } from "drizzle-orm";
import { type ProductKey, planLimits, usagePricing } from "~/config/billing";
import { db } from "~/db";
import { subscriptionsTable } from "~/db/schema";
import {
	getOrganizationMatterCount,
	getOrganizationUsagePrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/infra/db-prepared";
import { env } from "~/lib/infra/env";
import { logger } from "~/lib/utils/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookPayload {
	business_id: string;
	type?: string;
	event_type?: string;
	timestamp: string | Date;
	data: {
		payload_type?: string;
		subscription_id?: string | null;
		payment_id?: string | null;
		customer_id?: string | null;
		customer?: { customer_id: string; email: string; name?: string } | null;
		metadata?: { organizationId?: string; [key: string]: unknown } | null;
		product_id?: string | null;
		status?: string | null;
		recurring_pre_tax_amount?: number | null;
		currency?: string | null;
		payment_frequency_interval?: string | null;
		created_at?: string | null;
		next_billing_date?: string | null;
		cancelled_at?: string | null;
		total_amount?: number | null;
		[key: string]: unknown;
	};
}

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
}

// =============================================================================
// CACHE (in-memory with 5-min TTL)
// =============================================================================

const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function getOrganizationUsage(orgId: string): Promise<PlanUsage> {
	const cached = usageCache.get(orgId);
	if (cached && cached.expires > Date.now()) return cached.data;

	const usage = await getOrganizationUsagePrepared(orgId);
	usageCache.set(orgId, { data: usage, expires: Date.now() + CACHE_TTL });
	return usage;
}

export function invalidateUsageCache(orgId: string) {
	usageCache.delete(orgId);
}

export function invalidateAllOrganizationCaches(orgId: string) {
	invalidateUsageCache(orgId);
}

export function getCacheStats() {
	return { usageCache: { size: usageCache.size } };
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

export async function getOrganizationSubscription(orgId: string) {
	const result = await getOrgSubscriptionPrepared.execute({
		organizationId: orgId,
	});
	return result[0] ?? null;
}

export async function upsertSubscription(
	customerId: string,
	orgId: string,
	payload: WebhookPayload["data"],
	status: string,
) {
	const planKey = payload.product_id
		? getPlanByProductId(payload.product_id)
		: null;

	const data = {
		billingCustomerId: customerId,
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
						subscriptionsTable.dodoSubscriptionId,
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
			await tx.insert(subscriptionsTable).values({ id: createId(), ...data });
		}
	});
}

// =============================================================================
// LIMITS
// =============================================================================

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
	const sub = await getOrganizationSubscription(orgId);
	if (!sub || hasSubscriptionEnded(sub)) return "starter";
	if (sub.planKey) return sub.planKey as ProductKey;
	if (sub.productId) return getPlanByProductId(sub.productId) ?? "starter";
	return "starter";
}

export async function checkPlanLimits(
	orgId: string,
	overridePlan?: ProductKey,
): Promise<PlanLimitCheck> {
	const sub = await getOrganizationSubscription(orgId);
	let effectivePlan: ProductKey = overridePlan ?? "starter";

	if (!overridePlan && sub) {
		effectivePlan = hasSubscriptionEnded(sub)
			? "starter"
			: ((sub.planKey as ProductKey) ?? "starter");
	}

	const usage = { ...(await getOrganizationUsage(orgId)) };
	if (typeof usage.matters !== "number") {
		const result = await getOrganizationMatterCount.execute({ orgId });
		usage.matters = result[0]?.count ?? 0;
	}

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
	const [memberCheck, teamCheck, usage] = await Promise.all([
		canAddMember(orgId),
		canCreateTeam(orgId),
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
	};
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

const STATUS_MAP: Record<
	string,
	{ type: "subscription" | "payment"; status: string }
> = {
	"subscription.active": { type: "subscription", status: "active" },
	"subscription.renewed": { type: "subscription", status: "active" },
	"subscription.updated": { type: "subscription", status: "active" },
	"subscription.plan_changed": { type: "subscription", status: "active" },
	"subscription.on_hold": { type: "subscription", status: "on_hold" },
	"subscription.cancelled": { type: "subscription", status: "cancelled" },
	"subscription.failed": { type: "subscription", status: "failed" },
	"subscription.expired": { type: "subscription", status: "expired" },
	"payment.succeeded": { type: "payment", status: "succeeded" },
	"payment.failed": { type: "payment", status: "failed" },
	"payment.processing": { type: "payment", status: "processing" },
	"payment.cancelled": { type: "payment", status: "cancelled" },
};

export async function handleBillingWebhook(payload: WebhookPayload) {
	const eventType = payload.type || payload.event_type || "";

	try {
		const data = payload.data;

		let customerId: string | undefined;
		const orgId =
			(typeof data?.metadata?.organizationId === "string"
				? data.metadata.organizationId
				: "") || "";

		const mapped = STATUS_MAP[eventType];

		if (mapped && customerId) {
			if (!orgId) {
				throw new Error(
					`[Billing] Cannot process ${eventType} for customer ${customerId}: missing orgId`,
				);
			}

			if (mapped.type === "subscription")
				await upsertSubscription(customerId, orgId, data, mapped.status);
		}
	} catch (error) {
		logger.error("[Billing] Webhook error:", error);
		throw error;
	}
}

export const getPlanByProductId = (productId: string): ProductKey | null => {
	if (!productId) return null;
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
	return null;
};
