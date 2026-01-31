/**
 * Billing Service - Server-side billing operations
 */

import DodoPayments from "dodopayments";
import {
	canPurchaseAddons,
	getAddonConfig,
	getEffectiveMemberLimit,
	getEffectiveStorageLimit,
	type ProductKey,
	planLimits,
} from "~/config/billing";
import {
	getOrganizationMatterCount,
	getOrganizationMemberCount,
	getOrganizationStorageUsage,
	getOrganizationTeamCount,
	getOrganizationSubscription as getOrgSubPrepared,
} from "~/lib/infra/db-prepared";
import { env } from "~/lib/infra/env";

// =============================================================================
// TYPES
// =============================================================================

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
	storageGb?: number;
}

export interface LimitCheck {
	allowed: boolean;
	reason?: string;
	current: number;
	limit: number;
}

interface SubscriptionRecord {
	id: string;
	organizationId: string;
	billingCustomerId: string;
	billingSubscriptionId: string | null;
	plan: string;
	productId: string;
	status: string;
	billingInterval: string | null;
	preTaxAmount: number | null;
	purchasedSeats: number;
	purchasedStorageGB: number;
	onDemand: boolean;
	paymentFrequencyInterval: string | null;
	previousBillingDate: Date | null;
	nextBillingDate: Date | null;
	cancelledAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export type Subscription = Awaited<ReturnType<typeof fetchOrgSubscription>>;

// =============================================================================
// CLIENT & CONFIG
// =============================================================================

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
// CACHE - Split by metric for granular invalidation
// =============================================================================

const cache = {
	members: new Map<string, { data: number; exp: number }>(),
	teams: new Map<string, { data: number; exp: number }>(),
	matters: new Map<string, { data: number; exp: number }>(),
	storage: new Map<string, { data: number; exp: number }>(),
	subscription: new Map<string, { data: SubscriptionRecord; exp: number }>(),
	ttl: {
		members: 5 * 60_000, // 5 minutes
		teams: 5 * 60_000, // 5 minutes
		matters: 30_000, // 30 seconds - high churn
		storage: 60_000, // 1 minute
		subscription: 30 * 60_000, // 30 minutes
	},
};

function getCached<T>(
	store: Map<string, { data: T; exp: number }>,
	key: string,
): T | null {
	const entry = store.get(key);
	return entry && entry.exp > Date.now() ? entry.data : null;
}

function setCache<T>(
	store: Map<string, { data: T; exp: number }>,
	key: string,
	data: T,
	ttl: number,
): void {
	store.set(key, { data, exp: Date.now() + ttl });
}

// =============================================================================
// CACHE INVALIDATION - Switch statement based on metric type
// =============================================================================

export function clearUsageCache(
	orgId: string,
	metric?: "members" | "teams" | "matters" | "storage" | "all",
): void {
	// Default to "all" for backward compatibility
	const targetMetric = metric ?? "all";

	switch (targetMetric) {
		case "members":
			cache.members.delete(orgId);
			break;
		case "teams":
			cache.teams.delete(orgId);
			break;
		case "matters":
			cache.matters.delete(orgId);
			break;
		case "storage":
			cache.storage.delete(orgId);
			break;
		case "all":
			// Clear all usage caches
			cache.members.delete(orgId);
			cache.teams.delete(orgId);
			cache.matters.delete(orgId);
			cache.storage.delete(orgId);
			break;
		default:
			// Unknown metric - clear all to be safe
			cache.members.delete(orgId);
			cache.teams.delete(orgId);
			cache.matters.delete(orgId);
			cache.storage.delete(orgId);
	}
}

export function clearSubscriptionCache(orgId: string): void {
	cache.subscription.delete(orgId);
}

// =============================================================================
// INDIVIDUAL METRIC FETCHERS
// =============================================================================

async function fetchMemberCount(orgId: string): Promise<number> {
	const cached = getCached(cache.members, orgId);
	if (cached !== null) return cached;

	const result = await getOrganizationMemberCount.execute({
		organizationId: orgId,
	});
	const count = result[0]?.count ?? 0;
	setCache(cache.members, orgId, count, cache.ttl.members);
	return count;
}

async function fetchTeamCount(orgId: string): Promise<number> {
	const cached = getCached(cache.teams, orgId);
	if (cached !== null) return cached;

	const result = await getOrganizationTeamCount.execute({ orgId });
	const count = result[0]?.count ?? 0;
	setCache(cache.teams, orgId, count, cache.ttl.teams);
	return count;
}

async function fetchMatterCount(orgId: string): Promise<number> {
	const cached = getCached(cache.matters, orgId);
	if (cached !== null) return cached;

	const result = await getOrganizationMatterCount.execute({ orgId });
	const count = result[0]?.count ?? 0;
	setCache(cache.matters, orgId, count, cache.ttl.matters);
	return count;
}

async function fetchStorageUsage(orgId: string): Promise<number> {
	// Storage cache disabled: in-memory Map doesn't work across server instances.
	// The storage_usage_cache DB table serves as the authoritative cache.
	const result = await getOrganizationStorageUsage.execute({ orgId });
	const totalBytes = result[0]?.totalBytes ?? 0;
	const storageGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;
	return storageGb;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

const DEFAULT_SUB = {
	plan: "starter" as const,
	status: "active" as const,
	purchasedSeats: 0,
	purchasedStorageGB: 0,
};

export async function fetchOrgUsage(orgId: string): Promise<PlanUsage> {
	// Fetch each metric independently (parallel) - each may be cached
	const [members, teams, matters, storageGb] = await Promise.all([
		fetchMemberCount(orgId),
		fetchTeamCount(orgId),
		fetchMatterCount(orgId),
		fetchStorageUsage(orgId),
	]);

	return {
		members,
		teams,
		matters,
		storageGb,
	};
}

export async function fetchOrgSubscription(
	orgId?: string | null,
): Promise<SubscriptionRecord> {
	const key = orgId ?? "";
	const cached = getCached(cache.subscription, key);
	if (cached) return cached;

	const result = orgId
		? await getOrgSubPrepared.execute({ organizationId: orgId })
		: [];

	const data = (result[0] ?? DEFAULT_SUB) as SubscriptionRecord;
	setCache(cache.subscription, key, data, cache.ttl.subscription);
	return data;
}

// =============================================================================
// PLAN HELPERS
// =============================================================================

function isExpired(sub: {
	status?: string | null;
	nextBillingDate?: string | Date | null;
}): boolean {
	if (sub?.status !== "active") return true;
	if (!sub?.nextBillingDate) return false;
	return new Date(sub.nextBillingDate) < new Date();
}

function isUnlimited(limit: number): boolean {
	return limit === -1;
}

function formatLimitReason(
	type: string,
	limit: number,
	plan: ProductKey,
): string {
	const label = type.charAt(0).toUpperCase() + type.slice(1);
	const action =
		plan === "starter" ? "Upgrade to add more." : "Please upgrade your plan.";
	return `${label} limit (${limit}) reached. ${action}`;
}

export async function resolveOrgPlan(orgId: string): Promise<ProductKey> {
	const sub = await fetchOrgSubscription(orgId);
	if (!sub || isExpired(sub)) return "starter";
	if (sub.plan) return sub.plan as ProductKey;
	if (sub.productId) return resolveProductPlan(sub.productId) ?? "starter";
	return "starter";
}

export function resolveProductPlan(productId: string): ProductKey | null {
	if (!productId) return null;
	const growth = [
		env.DODO_PRODUCT_GROWTH_MONTHLY,
		env.DODO_PRODUCT_GROWTH_YEARLY,
	];
	const pro = [
		env.DODO_PRODUCT_PROFESSIONAL_MONTHLY,
		env.DODO_PRODUCT_PROFESSIONAL_YEARLY,
	];
	if (growth.includes(productId)) return "growth";
	if (pro.includes(productId)) return "pro";
	return null;
}

// =============================================================================
// LIMIT CHECKS
// =============================================================================

export async function checkMemberLimit(
	orgId: string,
): Promise<LimitCheck & { canPurchaseAddon: boolean }> {
	const [sub, usage] = await Promise.all([
		fetchOrgSubscription(orgId),
		fetchOrgUsage(orgId),
	]);
	const plan = (sub?.plan as ProductKey) ?? "starter";
	const limit = getEffectiveMemberLimit(plan, sub?.purchasedSeats ?? 0);
	const canAdd = plan !== "starter" && plan !== "enterprise";

	if (isUnlimited(limit) || usage.members < limit) {
		return {
			allowed: true,
			current: usage.members,
			limit,
			canPurchaseAddon: canAdd,
		};
	}
	return {
		allowed: false,
		reason: formatLimitReason("members", limit, plan),
		current: usage.members,
		limit,
		canPurchaseAddon: canAdd,
	};
}

export async function checkMatterLimit(orgId: string): Promise<LimitCheck> {
	const [sub, usage] = await Promise.all([
		fetchOrgSubscription(orgId),
		fetchOrgUsage(orgId),
	]);
	const plan = (sub?.plan as ProductKey) ?? "starter";
	const limit = planLimits[plan].matters;

	if (isUnlimited(limit) || usage.matters < limit) {
		return { allowed: true, current: usage.matters, limit };
	}
	return {
		allowed: false,
		reason: formatLimitReason("matters", limit, plan),
		current: usage.matters,
		limit,
	};
}

// =============================================================================
// AGGREGATED STATUS
// =============================================================================

export async function getOrgLimits(orgId: string) {
	const [sub, usage] = await Promise.all([
		fetchOrgSubscription(orgId),
		fetchOrgUsage(orgId),
	]);
	const plan = (sub?.plan as ProductKey) ?? "starter";
	const limits = planLimits[plan];
	const memberLimit = getEffectiveMemberLimit(plan, sub?.purchasedSeats ?? 0);
	const expired = isExpired(sub ?? {});

	const membersOk = isUnlimited(memberLimit) || usage.members < memberLimit;
	const teamsOk =
		isUnlimited(limits.teams) ||
		usage.teams < limits.teams ||
		((plan === "growth" || plan === "pro") && !expired);
	const mattersOk =
		isUnlimited(limits.matters) || usage.matters < limits.matters;

	return {
		plan,
		members: {
			current: usage.members,
			limit: memberLimit,
			allowed: membersOk,
			reason: membersOk
				? undefined
				: formatLimitReason("members", memberLimit, plan),
			canPurchaseAddon: plan !== "starter" && plan !== "enterprise",
		},
		teams: {
			current: usage.teams,
			limit: limits.teams,
			allowed: teamsOk,
			reason: teamsOk
				? undefined
				: formatLimitReason("teams", limits.teams, plan),
		},
		matters: {
			current: usage.matters,
			limit: limits.matters,
			allowed: mattersOk,
			reason: mattersOk
				? undefined
				: formatLimitReason("matters", limits.matters, plan),
		},
	};
}

export async function getBillingStatus(orgId: string) {
	const [sub, usage, memberCheck] = await Promise.all([
		fetchOrgSubscription(orgId),
		fetchOrgUsage(orgId),
		checkMemberLimit(orgId),
	]);

	const plan: ProductKey =
		sub && !isExpired(sub)
			? ((sub.plan as ProductKey) ?? "starter")
			: "starter";
	const limits = planLimits[plan];
	const seats = sub?.purchasedSeats ?? 0;
	const storage = sub?.purchasedStorageGB ?? 0;

	return {
		plan,
		limits,
		usage,
		members: {
			...memberCheck,
			requiresAddonPurchase: !memberCheck.allowed && plan !== "starter",
			priceCents: getAddonConfig(plan)?.seatPriceCents ?? null,
			baseLimit: limits.members,
		},
		effectiveLimits: {
			members: getEffectiveMemberLimit(plan, seats),
			teams: limits.teams,
			matters: limits.matters,
			storageGb: getEffectiveStorageLimit(plan, storage),
		},
		purchasedAddons: { seats, storageGb: storage },
		addonPurchase: canPurchaseAddons(plan, sub?.nextBillingDate ?? null),
	};
}

// =============================================================================
// WEBHOOK HELPERS
// =============================================================================

interface WebhookAddon {
	addon_id: string;
	quantity: number;
}

export function parseWebhookAddons(addons: WebhookAddon[] = []) {
	const seatIds = new Set(
		[env.DODO_ADDON_SEAT_GROWTH, env.DODO_ADDON_SEAT_PRO].filter(Boolean),
	);
	const storageIds = new Set(
		[env.DODO_ADDON_STORAGE_GROWTH, env.DODO_ADDON_STORAGE_PRO].filter(Boolean),
	);

	return addons.reduce(
		(acc, { addon_id, quantity }) => {
			if (seatIds.has(addon_id)) acc.purchasedSeats += quantity;
			else if (storageIds.has(addon_id)) acc.purchasedStorageGB += quantity;
			return acc;
		},
		{ purchasedSeats: 0, purchasedStorageGB: 0 },
	);
}
