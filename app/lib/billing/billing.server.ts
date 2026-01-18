import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { subscriptionsTable } from "~/db/schema";
import { BillingService } from "~/services/billing/billing.server";
import { UsageService } from "~/services/billing/usage.server";
import type { ProductKey } from "./plans";
import { planLimits } from "./plans";

export type PaymentProvider = "dodo" | "stripe" | "manual" | null;

export interface BillingConfig {
	provider: PaymentProvider;
	apiKey?: string;
	webhookSecret?: string;
	webhookUrl?: string;
	successUrl: string;
	enabled: boolean;
}

let _config: BillingConfig | null = null;

export function getBillingConfig(): BillingConfig {
	if (!_config) {
		const siteUrl = process.env.SITE_URL || "http://localhost:3000";
		_config = {
			provider: process.env.BILLING_PROVIDER
				? (process.env.BILLING_PROVIDER as PaymentProvider)
				: null,
			apiKey: process.env.DODO_PAYMENTS_API_KEY,
			webhookSecret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET,
			webhookUrl: process.env.DODO_PAYMENTS_WEBHOOK_URL,
			successUrl: `${siteUrl}/billing/success`,
			enabled: !!(process.env.BILLING_PROVIDER === "manual"),
		};
	}
	return _config;
}

export function getBillingProvider(): PaymentProvider {
	const config = getBillingConfig();
	return config.provider || null;
}

export function isManualBilling(): boolean {
	return getBillingProvider() === "manual";
}

export function isDodoBilling(): boolean {
	return getBillingProvider() === "dodo";
}

export function isBillingEnabled(): boolean {
	const config = getBillingConfig();
	return config.enabled || isManualBilling();
}

export function invalidateBillingCache() {
	_config = null;
}

export async function getOrgPlanKey(orgId: string): Promise<ProductKey> {
	const result = await db
		.select({
			planKey: subscriptionsTable.planKey,
			currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
		})
		.from(subscriptionsTable)
		.where(
			and(
				eq(subscriptionsTable.organizationId, orgId),
				eq(subscriptionsTable.status, "active"),
			),
		)
		.orderBy(subscriptionsTable.currentPeriodEnd)
		.limit(1);

	if (!result.length) {
		return "starter";
	}

	const planKey = result[0].planKey;
	const currentPeriodEnd = result[0].currentPeriodEnd;

	if (
		!planKey ||
		(currentPeriodEnd && new Date(currentPeriodEnd) < new Date())
	) {
		return "starter";
	}

	return planKey as ProductKey;
}

export async function getOrganizationCustomer(
	orgId: string,
): Promise<string | null> {
	const result = await db
		.select({ billingCustomerId: subscriptionsTable.billingCustomerId })
		.from(subscriptionsTable)
		.where(eq(subscriptionsTable.organizationId, orgId))
		.limit(1);

	return result[0]?.billingCustomerId ?? null;
}

export async function checkPlanLimits(
	orgId: string,
	overridePlan?: ProductKey,
): Promise<{
	withinLimits: boolean;
	usage: {
		members: number;
		teams: number;
		matters: number;
		storageGb: number;
	};
	effectivePlan: ProductKey;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		matters?: { current: number; limit: number };
		storage?: { current: number; limit: number; remaining?: number };
	};
}> {
	const effectivePlan = overridePlan ?? (await getOrgPlanKey(orgId));
	const currentUsage = await UsageService.getUsage(orgId);

	const usage = {
		members: currentUsage.members || 0,
		teams: currentUsage.teams || 0,
		matters: currentUsage.matters || 0,
		storageGb: (currentUsage.storage_bytes || 0) / (1024 * 1024 * 1024),
	};

	const limits = planLimits[effectivePlan];
	const violations: Record<
		string,
		{ current: number; limit: number; remaining?: number } | undefined
	> = {
		members: undefined,
		teams: undefined,
		matters: undefined,
		storage: undefined,
	};

	let withinLimits = true;

	if (limits.members !== -1 && usage.members > limits.members) {
		violations.members = {
			current: usage.members,
			limit: limits.members as number,
		};
		withinLimits = false;
	}
	if (limits.teams !== -1 && usage.teams > limits.teams) {
		violations.teams = { current: usage.teams, limit: limits.teams as number };
		withinLimits = false;
	}
	if (limits.matters !== -1 && usage.matters > limits.matters) {
		violations.matters = {
			current: usage.matters,
			limit: limits.matters as number,
		};
		withinLimits = false;
	}
	if (limits.storageGb !== -1 && usage.storageGb > limits.storageGb) {
		violations.storage = {
			current: Math.round(usage.storageGb * 100) / 100,
			limit: limits.storageGb,
			remaining: Math.max(
				0,
				Math.ceil((limits.storageGb - usage.storageGb) * 100) / 100,
			),
		};
		withinLimits = false;
	}

	return { withinLimits, usage, effectivePlan, limits, violations };
}

export async function canAddMember(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);

	if (limits.members === -1 || effectivePlan === "enterprise") {
		return {
			allowed: true,
			currentCount: usage.members,
			limit: -1,
			isOverage: false,
			message:
				effectivePlan === "enterprise"
					? "Unlimited"
					: "This member is included in your plan",
		};
	}

	if (usage.members >= limits.members) {
		return {
			allowed: false,
			reason: `Member limit (${limits.members}) reached`,
			currentCount: usage.members,
			limit: limits.members,
			isOverage: false,
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

	if (limits.teams === -1 || effectivePlan === "enterprise") {
		return {
			allowed: true,
			currentCount: usage.teams,
			limit: -1,
			isOverage: false,
			message: "Unlimited",
		};
	}

	if (usage.teams >= limits.teams) {
		return {
			allowed: false,
			reason: `Team limit (${limits.teams}) reached`,
			currentCount: usage.teams,
			limit: limits.teams,
			isOverage: false,
		};
	}

	return {
		allowed: true,
		currentCount: usage.teams,
		limit: limits.teams,
		isOverage: false,
		message: "This team is included in your plan",
	};
}

export async function canCreateMatter(orgId: string) {
	const { usage, limits, effectivePlan } = await checkPlanLimits(orgId);

	if (limits.matters === -1 || effectivePlan === "enterprise") {
		return {
			allowed: true,
			currentCount: usage.matters,
			limit: -1,
			isOverage: false,
			message: "Unlimited",
		};
	}

	if (usage.matters >= limits.matters) {
		return {
			allowed: false,
			reason: `Matter limit (${limits.matters}) reached`,
			currentCount: usage.matters,
			limit: limits.matters,
			isOverage: false,
		};
	}

	return {
		allowed: true,
		currentCount: usage.matters,
		limit: limits.matters,
		isOverage: false,
		message: "This matter is included in your plan",
	};
}

export async function canUploadFile(
	orgId: string,
	fileSizeBytes: number,
): Promise<{
	allowed: boolean;
	reason?: string;
	currentUsageGb: number;
	limitGb: number;
	maxFileSizeMb: number;
}> {
	const { limits, effectivePlan } = await checkPlanLimits(orgId);
	const storageBytes = await UsageService.getMetric(orgId, "storage_bytes");
	const limitBytes =
		limits.storageGb === -1 ? Infinity : limits.storageGb * 1024 * 1024 * 1024;

	if (fileSizeBytes > limits.maxFileSizeMb * 1024 * 1024) {
		return {
			allowed: false,
			reason: `File size exceeds plan limit (${limits.maxFileSizeMb}MB)`,
			currentUsageGb: storageBytes / (1024 * 1024 * 1024),
			limitGb: limits.storageGb,
			maxFileSizeMb: limits.maxFileSizeMb,
		};
	}

	const newUsageBytes = storageBytes + fileSizeBytes;

	if (newUsageBytes > limitBytes) {
		return {
			allowed: false,
			reason: `Storage limit (${limits.storageGb}GB) exceeded`,
			currentUsageGb: newUsageBytes / (1024 * 1024 * 1024),
			limitGb: limits.storageGb,
			maxFileSizeMb: limits.maxFileSizeMb,
		};
	}

	return {
		allowed: true,
		currentUsageGb: storageBytes / (1024 * 1024 * 1024),
		limitGb: limits.storageGb,
		maxFileSizeMb: limits.maxFileSizeMb,
	};
}

export const dodoPayments = BillingService.getClient();

export const billingConfig = {
	getBillingConfig,
	getBillingProvider,
	isManualBilling,
	isDodoBilling,
	isBillingEnabled,
	invalidateBillingCache,
};

// Backward compatibility: keep exports for now
export { getOrgPlanKey as getOrganizationPlanKey };
export function invalidateUsageCache(_orgId: string) {
	// No-op for now as cache is now db-based usage_cache
}
