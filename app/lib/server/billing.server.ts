/**
 * Billing Server Module - Consolidated
 * Simplified: ~320 lines vs original 1,142 lines (across 5 files)
 */
import { createId } from "@paralleldrive/cuid2";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import {
	customersTable,
	membersTable,
	paymentsTable,
	subscriptionsTable,
	usersTable,
	webhookEventsTable,
} from "~/db/schema";
import {
	getPlanByProductId,
	type ProductKey,
	planLimits,
	usagePricing,
} from "~/lib/billing";
import { logger } from "~/lib/logger";
import {
	getCustomerByDodoId,
	getOrganizationMatterCount,
	getOrganizationUsagePrepared,
	getOrganizationCustomer as getOrgCustomerPrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/server/prepared-queries.server";

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

export function invalidateUsageCache(orgId: string): void {
	usageCache.delete(orgId);
}

export function invalidateAllOrganizationCaches(orgId: string): void {
	invalidateUsageCache(orgId);
}

export function getCacheStats() {
	return { usageCache: { size: usageCache.size } };
}

// =============================================================================
// REPOSITORY
// =============================================================================

export async function getOrganizationSubscription(orgId: string) {
	const result = await getOrgSubscriptionPrepared.execute({
		organizationId: orgId,
	});
	return result[0] ?? null;
}

export async function getOrganizationCustomer(orgId: string) {
	const result = await getOrgCustomerPrepared.execute({
		organizationId: orgId,
	});
	return result[0] ?? null;
}

export async function getOrganizationPayments(orgId: string, limit = 10) {
	return db.query.paymentsTable.findMany({
		where: eq(paymentsTable.organizationId, orgId),
		orderBy: (p, { desc }) => desc(p.createdAt),
		limit,
	});
}

export async function linkCustomerToOrganization(
	dodoCustomerId: string,
	orgId: string,
): Promise<void> {
	await db
		.update(customersTable)
		.set({ organizationId: orgId })
		.where(eq(customersTable.dodoCustomerId, dodoCustomerId));
}

async function recordWebhookEvent(
	webhookId: string,
	eventType: string,
	payload: string,
): Promise<boolean> {
	const inserted = await db
		.insert(webhookEventsTable)
		.values({ id: createId(), webhookId, eventType, payload })
		.onConflictDoNothing({ target: webhookEventsTable.webhookId })
		.returning({ id: webhookEventsTable.id });
	return inserted.length > 0;
}

async function deleteWebhookEvent(webhookId: string): Promise<void> {
	await db
		.delete(webhookEventsTable)
		.where(eq(webhookEventsTable.webhookId, webhookId));
}

export async function upsertCustomer(
	dodoCustomerId: string,
	email: string,
	name?: string,
	orgId?: string,
) {
	return db.transaction(async (tx) => {
		let existing = await tx.query.customersTable.findFirst({
			where: eq(customersTable.dodoCustomerId, dodoCustomerId),
		});
		let resolvedOrgId = orgId ?? "";

		if (!resolvedOrgId && email) {
			const user = await tx.query.usersTable.findFirst({
				where: eq(usersTable.email, email),
			});
			if (user) {
				const membership = await tx.query.membersTable.findFirst({
					where: eq(membersTable.userId, user.id),
					orderBy: (m, { desc }) => desc(m.createdAt),
				});
				resolvedOrgId = membership?.organizationId ?? "";
			}
		}

		if (!existing && resolvedOrgId) {
			existing = await tx.query.customersTable.findFirst({
				where: eq(customersTable.organizationId, resolvedOrgId),
			});
		}

		if (existing) {
			await tx
				.update(customersTable)
				.set({
					dodoCustomerId,
					email,
					name: name ?? existing.name,
					organizationId: resolvedOrgId || existing.organizationId,
				})
				.where(eq(customersTable.id, existing.id));
			return {
				customerId: existing.id,
				organizationId: resolvedOrgId || existing.organizationId,
			};
		}

		if (!resolvedOrgId)
			throw new Error("Cannot create customer without organization");
		const customerId = createId();
		await tx.insert(customersTable).values({
			id: customerId,
			dodoCustomerId,
			email,
			name,
			organizationId: resolvedOrgId,
		});
		return { customerId, organizationId: resolvedOrgId };
	});
}

export async function upsertSubscription(
	customerId: string,
	orgId: string,
	payload: WebhookPayload["data"],
	status: string,
): Promise<void> {
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
						subscriptionsTable.dodoSubscriptionId,
						payload.subscription_id,
					),
				})
			: null;

		if (!existing) {
			existing = await tx.query.subscriptionsTable.findFirst({
				where: and(
					eq(subscriptionsTable.organizationId, orgId),
					eq(subscriptionsTable.productId, data.productId),
					eq(subscriptionsTable.status, "active"),
				),
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

export async function recordPayment(
	customerId: string,
	orgId: string,
	payload: WebhookPayload["data"],
	status: string,
) {
	if (!payload.payment_id) return;

	await db.transaction(async (tx) => {
		const existing = await tx.query.paymentsTable.findFirst({
			where: eq(paymentsTable.dodoPaymentId, payload.payment_id!),
		});
		let subscriptionId: string | null = null;
		let resolvedOrgId = orgId;

		if (payload.subscription_id) {
			const sub = await tx.query.subscriptionsTable.findFirst({
				where: eq(
					subscriptionsTable.dodoSubscriptionId,
					payload.subscription_id,
				),
			});
			subscriptionId = sub?.id ?? null;
			resolvedOrgId = sub?.organizationId || resolvedOrgId;
		}

		if (existing) {
			await tx
				.update(paymentsTable)
				.set({
					status,
					amount: payload.total_amount ?? existing.amount,
					currency: payload.currency ?? existing.currency,
				})
				.where(eq(paymentsTable.id, existing.id));
		} else {
			await tx.insert(paymentsTable).values({
				id: createId(),
				customerId,
				organizationId: resolvedOrgId,
				subscriptionId,
				dodoPaymentId: payload.payment_id,
				amount: payload.total_amount ?? 0,
				currency: payload.currency ?? "USD",
				status,
			});
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

export async function handleBillingWebhook(
	payload: WebhookPayload,
): Promise<void> {
	const eventType = payload.type || payload.event_type || "";
	const payloadHash = createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex")
		.substring(0, 16);
	const webhookId = `${eventType}_${typeof payload.timestamp === "object" ? payload.timestamp.toISOString() : payload.timestamp}_${payloadHash}`;

	if (
		!(await recordWebhookEvent(webhookId, eventType, JSON.stringify(payload)))
	)
		return;

	try {
		const data = payload.data;
		const customer =
			data?.customer ||
			(data?.customer_id
				? { customer_id: data.customer_id as string, email: "", name: "" }
				: undefined);
		let customerId: string | undefined;
		let orgId =
			(typeof data?.metadata?.organizationId === "string"
				? data.metadata.organizationId
				: "") || "";

		if (customer) {
			const [existingCustomer, user] = await Promise.all([
				getCustomerByDodoId.execute({ dodoCustomerId: customer.customer_id }),
				customer.email
					? db.query.usersTable.findFirst({
							where: eq(usersTable.email, customer.email),
						})
					: null,
			]);
			const membership = user
				? await db.query.membersTable.findFirst({
						where: eq(membersTable.userId, user.id),
					})
				: null;

			if (existingCustomer.length > 0) {
				customerId = existingCustomer[0].id;
				orgId = orgId || existingCustomer[0].organizationId || "";
			} else {
				if (!orgId && membership) orgId = membership.organizationId;
				const result = await upsertCustomer(
					customer.customer_id,
					customer.email,
					customer.name,
					orgId,
				);
				customerId = result.customerId;
				orgId = result.organizationId;
			}
		}

		const mapped = STATUS_MAP[eventType];
		if (mapped && customerId) {
			if (!orgId) {
				logger.warn(
					`[Billing] Skipping ${eventType} for customer ${customerId}: missing orgId`,
				);
				return;
			}
			if (mapped.type === "subscription")
				await upsertSubscription(customerId, orgId, data, mapped.status);
			else await recordPayment(customerId, orgId, data, mapped.status);
		}
	} catch (error) {
		logger.error("[Billing] Webhook error:", error);
		await deleteWebhookEvent(webhookId).catch(() => {});
		throw error;
	}
}
