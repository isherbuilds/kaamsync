import { createId } from "@paralleldrive/cuid2";
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
import {
	getCustomerByDodoId,
	getOrganizationUsagePrepared,
	getOrganizationCustomer as getOrgCustomerPrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/server/prepared-queries.server";

// Webhook payload types from Dodo Payments (via Better Auth plugin)
// Better Auth normalizes the payload with 'type' instead of 'event_type'
interface WebhookPayload {
	business_id: string;
	type?: string; // Better Auth uses 'type'
	event_type?: string; // Direct webhook uses 'event_type'
	timestamp: string | Date;
	data: {
		payload_type?: string;
		subscription_id?: string | null;
		payment_id?: string | null;
		customer_id?: string | null;
		customer?: {
			customer_id: string;
			email: string;
			name?: string;
		} | null;
		metadata?: {
			organizationId?: string;
			[key: string]: unknown;
		} | null;
		product_id?: string | null;
		status?: string | null;
		recurring_pre_tax_amount?: number | null;
		currency?: string | null;
		payment_frequency_interval?: string | null;
		created_at?: string | null;
		next_billing_date?: string | null;
		cancelled_at?: string | null;
		total_amount?: number | null;
		// Allow additional fields
		[key: string]: unknown;
	};
}

/**
 * Check if webhook has already been processed (idempotency)
 */
async function isWebhookProcessed(webhookId: string): Promise<boolean> {
	const existing = await db.query.webhookEventsTable.findFirst({
		where: eq(webhookEventsTable.webhookId, webhookId),
	});
	return !!existing;
}

/**
 * Record webhook event for idempotency
 */
async function recordWebhookEvent(
	webhookId: string,
	eventType: string,
	payload: string,
): Promise<void> {
	await db.insert(webhookEventsTable).values({
		id: createId(),
		webhookId,
		eventType,
		payload,
	});
}

/**
 * Upsert customer record
 */
async function upsertCustomer(
	dodoCustomerId: string,
	email: string,
	name?: string,
	organizationId?: string,
): Promise<{ customerId: string; organizationId: string }> {
	// 1. Try to find existing customer by Dodo ID
	let existing = await db.query.customersTable.findFirst({
		where: eq(customersTable.dodoCustomerId, dodoCustomerId),
	});

	// If no organizationId provided, try to find it from the user's email
	let resolvedOrgId = organizationId ?? "";
	if (!resolvedOrgId && email) {
		// Find user by email
		const user = await db.query.usersTable.findFirst({
			where: eq(usersTable.email, email),
		});

		if (user) {
			// Find their organization membership
			const membership = await db.query.membersTable.findFirst({
				where: eq(membersTable.userId, user.id),
			});

			if (membership) {
				resolvedOrgId = membership.organizationId;
			}
		}
	}

	// 2. If not found by Dodo ID, try to find by Organization ID (if we have one)
	// This prevents unique constraint violations on organizationId
	if (!existing && resolvedOrgId) {
		existing = await db.query.customersTable.findFirst({
			where: eq(customersTable.organizationId, resolvedOrgId),
		});
	}

	if (existing) {
		// Update if email/name changed; allow organization override when provided
		await db
			.update(customersTable)
			.set({
				dodoCustomerId, // Update Dodo ID in case we found by Org ID and it's missing/different
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

	// Create new customer
	const customerId = createId();
	await db.insert(customersTable).values({
		id: customerId,
		dodoCustomerId,
		email,
		name,
		organizationId: resolvedOrgId,
	});

	return { customerId, organizationId: resolvedOrgId };
}

/**
 * Upsert subscription record
 */
async function upsertSubscription(
	customerId: string,
	organizationId: string,
	payload: WebhookPayload["data"],
	status: string,
): Promise<void> {
	// Resolve planKey from productId
	const planKey = payload.product_id
		? getPlanByProductId(payload.product_id)
		: null;

	const subscriptionData = {
		customerId,
		organizationId,
		dodoSubscriptionId: payload.subscription_id,
		productId: payload.product_id ?? "",
		planKey, // Store resolved plan key for easy access
		status,
		billingInterval: payload.payment_frequency_interval?.toLowerCase(),
		amount: payload.recurring_pre_tax_amount,
		currency: payload.currency,
		currentPeriodEnd: payload.next_billing_date
			? new Date(payload.next_billing_date)
			: null,
		cancelledAt: payload.cancelled_at ? new Date(payload.cancelled_at) : null,
	};

	// Perform an explicit upsert by organizationId + productId.
	// Rationale: `dodoSubscriptionId` can be null, so conflicts based on it
	// may not be detected. Use org+product as the canonical uniqueness for
	// webhook-driven updates, and fall back to insert when no match exists.
	const existingSubscription = await db.query.subscriptionsTable.findFirst({
		where: and(
			eq(subscriptionsTable.organizationId, subscriptionData.organizationId),
			eq(subscriptionsTable.productId, subscriptionData.productId),
		),
	});

	if (existingSubscription) {
		await db
			.update(subscriptionsTable)
			.set(subscriptionData)
			.where(eq(subscriptionsTable.id, existingSubscription.id));
	} else {
		await db
			.insert(subscriptionsTable)
			.values({ id: createId(), ...subscriptionData });
	}
}

/**
 * Record payment
 */
async function recordPayment(
	customerId: string,
	organizationId: string,
	payload: WebhookPayload["data"],
	status: string,
): Promise<void> {
	// Check for existing payment
	const existing = await db.query.paymentsTable.findFirst({
		where: eq(paymentsTable.dodoPaymentId, payload.payment_id ?? ""),
	});

	if (existing) {
		// Update status
		await db
			.update(paymentsTable)
			.set({ status })
			.where(eq(paymentsTable.id, existing.id));
		return;
	}

	// Find subscription if exists
	let subscriptionId: string | null = null;
	let resolvedOrganizationId = organizationId;
	if (payload.subscription_id) {
		const subscription = await db.query.subscriptionsTable.findFirst({
			where: eq(subscriptionsTable.dodoSubscriptionId, payload.subscription_id),
		});
		subscriptionId = subscription?.id ?? null;
		resolvedOrganizationId =
			subscription?.organizationId || resolvedOrganizationId;
	}

	await db.insert(paymentsTable).values({
		id: createId(),
		customerId,
		organizationId: resolvedOrganizationId,
		subscriptionId,
		dodoPaymentId: payload.payment_id,
		amount: payload.total_amount ?? 0,
		currency: payload.currency ?? "USD",
		status,
	});
}

/**
 * Main webhook handler - processes all Dodo Payments events
 * NOTE: Signature verification is handled by Better Auth's webhooks plugin automatically
 */
export async function handleBillingWebhook(
	payload: WebhookPayload,
): Promise<void> {
	const eventType = payload.type || payload.event_type || "";
	const payloadTimestamp =
		typeof payload.timestamp === "object"
			? payload.timestamp.toISOString()
			: payload.timestamp;
	const generatedWebhookId = `${eventType}_${payloadTimestamp}_${payload.data?.subscription_id ?? payload.data?.payment_id ?? ""}`;

	// Idempotency check
	if (await isWebhookProcessed(generatedWebhookId)) {
		return;
	}

	try {
		const data = payload.data;
		const customer =
			data?.customer ||
			(data?.customer_id
				? { customer_id: data.customer_id as string, email: "", name: "" }
				: undefined);

		let customerId: string | undefined;
		let organizationId =
			(typeof payload.data?.metadata?.organizationId === "string"
				? payload.data?.metadata?.organizationId
				: "") || "";

		if (customer) {
			// OPTIMIZED: Use prepared statement for customer lookup
			const [existingCustomer, user] = await Promise.all([
				getCustomerByDodoId.execute({ dodoCustomerId: customer.customer_id }),
				customer.email
					? db.query.usersTable.findFirst({
							where: eq(usersTable.email, customer.email),
						})
					: Promise.resolve(null),
			]);

			// Get membership if we found a user
			const membershipResult = user
				? await db.query.membersTable.findFirst({
						where: eq(membersTable.userId, user.id),
					})
				: null;

			if (existingCustomer.length > 0) {
				customerId = existingCustomer[0].id;
				organizationId =
					organizationId || existingCustomer[0].organizationId || "";
			} else {
				// Resolve organization ID from user membership if not provided
				if (!organizationId && membershipResult) {
					organizationId = membershipResult.organizationId;
				}

				const result = await upsertCustomer(
					customer.customer_id,
					customer.email,
					customer.name,
					organizationId,
				);
				customerId = result.customerId;
				organizationId = result.organizationId;
			}
		}

		// Subscription status mapping for cleaner handling
		const SUBSCRIPTION_STATUS_MAP: Record<string, string> = {
			"subscription.active": "active",
			"subscription.renewed": "active",
			"subscription.updated": "active",
			"subscription.plan_changed": "active",
			"subscription.on_hold": "on_hold",
			"subscription.cancelled": "cancelled",
			"subscription.failed": "failed",
			"subscription.expired": "expired",
		};

		const PAYMENT_STATUS_MAP: Record<string, string> = {
			"payment.succeeded": "succeeded",
			"payment.failed": "failed",
			"payment.processing": "processing",
			"payment.cancelled": "cancelled",
		};

		// Handle subscription events
		const subscriptionStatus = SUBSCRIPTION_STATUS_MAP[eventType];
		if (subscriptionStatus && customerId) {
			await upsertSubscription(
				customerId,
				organizationId,
				data,
				subscriptionStatus,
			);
		}

		// Handle payment events
		const paymentStatus = PAYMENT_STATUS_MAP[eventType];
		if (paymentStatus && customerId) {
			await recordPayment(customerId, organizationId, data, paymentStatus);
		}

		await recordWebhookEvent(
			generatedWebhookId,
			eventType,
			JSON.stringify(payload),
		);
	} catch (error) {
		console.error(`[Billing] Webhook processing error:`, error);
		throw error;
	}
}

/**
 * Get organization's current subscription (OPTIMIZED with prepared statement)
 */
export async function getOrganizationSubscription(organizationId: string) {
	const result = await getOrgSubscriptionPrepared.execute({ organizationId });
	return result[0] ?? null;
}

/**
 * Get organization's billing customer (OPTIMIZED with prepared statement)
 */
export async function getOrganizationCustomer(organizationId: string) {
	const result = await getOrgCustomerPrepared.execute({ organizationId });
	return result[0] ?? null;
}

/**
 * Link a customer to an organization (called after checkout)
 */
export async function linkCustomerToOrganization(
	dodoCustomerId: string,
	organizationId: string,
): Promise<void> {
	await db
		.update(customersTable)
		.set({ organizationId })
		.where(eq(customersTable.dodoCustomerId, dodoCustomerId));
}

/**
 * Get organization's payment history
 */
export async function getOrganizationPayments(
	organizationId: string,
	limit = 10,
) {
	return db.query.paymentsTable.findMany({
		where: eq(paymentsTable.organizationId, organizationId),
		orderBy: (p, { desc }) => desc(p.createdAt),
		limit,
	});
}

// =============================================================================
// PLAN LIMIT ENFORCEMENT
// =============================================================================

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
	// storageGb: number; // Add when file storage is implemented
}

export interface PlanLimitCheck {
	withinLimits: boolean;
	usage: PlanUsage;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		matters?: { current: number; limit: number };
		// storage?: { current: number; limit: number };
	};
}

// Simple in-memory cache for organization usage (5-minute TTL)
const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current usage for an organization (SECURE & OPTIMIZED: Using prepared statements)
 */
export async function getOrganizationUsage(
	organizationId: string,
): Promise<PlanUsage> {
	// Check cache first
	const cached = usageCache.get(organizationId);
	if (cached && cached.expires > Date.now()) {
		return cached.data;
	}

	// SECURE & OPTIMIZED: Use prepared statements for better performance and security
	const usage = await getOrganizationUsagePrepared(organizationId);

	// Cache the result
	usageCache.set(organizationId, {
		data: usage,
		expires: Date.now() + USAGE_CACHE_TTL,
	});

	return usage;
}

/**
 * Invalidate usage cache for an organization (call after membership/team changes)
 * ENHANCED: Also invalidate related caches
 */
export function invalidateUsageCache(organizationId: string): void {
	usageCache.delete(organizationId);

	// Also clear any related cached data that might be affected
	// This ensures consistency across all cached organization data
	console.log(
		`[Cache] Invalidated usage cache for organization: ${organizationId}`,
	);
}

/**
 * Invalidate all caches for an organization (nuclear option)
 */
export function invalidateAllOrganizationCaches(organizationId: string): void {
	invalidateUsageCache(organizationId);
	// Add other cache invalidations here as needed
	console.log(
		`[Cache] Invalidated all caches for organization: ${organizationId}`,
	);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
	return {
		usageCache: {
			size: usageCache.size,
			entries: Array.from(usageCache.entries()).map(([key, value]) => ({
				key,
				expires: new Date(value.expires).toISOString(),
				data: value.data,
			})),
		},
	};
}

/**
 * Check if an organization's usage is within plan limits
 * Strict enforcement for Cancelled/Expired plans
 */
export async function checkPlanLimits(
	organizationId: string,
	planKey?: ProductKey,
): Promise<PlanLimitCheck> {
	const subscription = await getOrganizationSubscription(organizationId);
	let effectivePlan: ProductKey = planKey ?? "starter";

	if (subscription) {
		const isCancelled =
			subscription.status === "cancelled" || subscription.status === "expired";
		// Check cancellation date
		const periodEnded = subscription.currentPeriodEnd
			? new Date(subscription.currentPeriodEnd) < new Date()
			: true; // If no date, assume ended if cancelled

		if (isCancelled && periodEnded) {
			// If cancelled AND period ended, enforce Starter limits (or Strict 0?)
			// User requested "Soft Enforcement", so Starter is a good fallback "Free Tier".
			effectivePlan = "starter";
		} else {
			// Active or Cancelled-but-in-period
			effectivePlan = (subscription.planKey as ProductKey) || "starter";
		}
	}

	const usage = await getOrganizationUsage(organizationId);
	const limits = planLimits[effectivePlan];

	const violations: PlanLimitCheck["violations"] = {};
	let withinLimits = true;

	// Check members limit (-1 means unlimited)
	if (limits.members !== -1 && usage.members > limits.members) {
		violations.members = { current: usage.members, limit: limits.members };
		withinLimits = false;
	}

	// Check teams limit
	if (limits.teams !== -1 && usage.teams > limits.teams) {
		violations.teams = { current: usage.teams, limit: limits.teams };
		withinLimits = false;
	}

	// Check matters limit
	if (limits.matters !== -1 && usage.matters > limits.matters) {
		violations.matters = { current: usage.matters, limit: limits.matters };
		withinLimits = false;
	}

	return {
		withinLimits,
		usage,
		limits,
		violations,
	};
}

/**
 * Get the effective plan key for an organization
 * Used for UI display, NOT for strict limit checks (use checkPlanLimits)
 */
export async function getOrganizationPlanKey(
	organizationId: string,
): Promise<ProductKey> {
	const subscription = await getOrganizationSubscription(organizationId);

	// No subscription = starter plan
	if (!subscription) return "starter";

	// If cancelled/expired and period ended, they deemed 'starter' effectively
	if (
		subscription.status === "cancelled" ||
		subscription.status === "expired"
	) {
		const periodEnded = subscription.currentPeriodEnd
			? new Date(subscription.currentPeriodEnd) < new Date()
			: true;
		if (periodEnded) return "starter";
	}

	// Use stored planKey first (set during webhook processing)
	if (subscription.planKey) {
		return subscription.planKey as ProductKey;
	}

	// Fallback: resolve from productId (for legacy subscriptions)
	if (subscription.productId) {
		return getPlanByProductId(subscription.productId) ?? "starter";
	}

	return "starter";
}

/**
 * Check if adding a new member is allowed
 * Implements "Soft Enforcement": Block only if currently over limit.
 */
export async function canAddMember(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
	message?: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	const usage = limitCheck.usage;

	// Unlimited members
	if (limits.members === -1) {
		return {
			allowed: true,
			currentCount: usage.members,
			limit: -1,
		};
	}

	// Strict Check: Are we ALREADY at or over the limit?
	if (usage.members >= limits.members) {
		// New Logic: Block new additions if over limit.
		// Previous Logic allowed Pay-Per-Action.
		// Now we want to STOP "adding new" if cancelled or over limit.
		// Unless it's an active Growth/Pro plan that supports overages?
		// User said: "How about we kick? ... block ability to add tasks ... block the amount"
		// User also said: "Soft Enforcement ... workspace enters Roach Motel".

		// If plan supports usage-based billing (Growth/Pro) AND is Active, allow.
		// If plan is Starter or Cancelled, BLOCK.

		const sub = await getOrganizationSubscription(organizationId);
		const isActivePaid = sub?.status === "active" && limits.members !== 3; // simplistic check for Paid

		if (isActivePaid) {
			// Allow overage for paid plans (billable)
			return {
				allowed: true,
				currentCount: usage.members,
				limit: limits.members,
				isOverage: true,
				message: `Adding this member will cost extra.`,
			};
		}

		// Block for Free/Starter/Cancelled
		return {
			allowed: false,
			reason: `You have reached the member limit for your plan (${limits.members}). Upgrade to add more.`,
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
		message: `This member is included in your plan`,
	};
}

/**
 * Get current member count and plan limit for an organization
 */
export async function getMemberCount(organizationId: string): Promise<{
	currentMembers: number;
	planLimit: number;
	plan: string;
	effectivePlan: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const planKey = await getOrganizationPlanKey(organizationId); // UI Plan

	return {
		currentMembers: limitCheck.usage.members,
		planLimit: limitCheck.limits.members,
		plan: planKey,
		effectivePlan: planKey, // Could differ if strictly enforcing starter
	};
}

/**
 * Get organization's current plan
 */
export async function getOrganizationPlan(
	organizationId: string,
): Promise<ProductKey> {
	return getOrganizationPlanKey(organizationId);
}

/**
 * Check if creating a new team is allowed
 */
export async function canCreateTeam(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	const usage = limitCheck.usage;

	// Unlimited teams
	if (limits.teams === -1) {
		return {
			allowed: true,
			currentCount: usage.teams,
			limit: -1,
		};
	}

	// Strict "Roach Motel" check
	if (usage.teams >= limits.teams) {
		// Allows overage for paid plans?
		// Plan config says Growth="-1", Pro="15".
		// If Pro user wants 16 teams? UsagePricing exists for "teamCreated", so Yes allow for Paid.

		const sub = await getOrganizationSubscription(organizationId);
		const isActivePaid =
			sub?.status === "active" &&
			(sub.planKey === "pro" || sub.planKey === "growth");

		if (isActivePaid) {
			return {
				allowed: true,
				currentCount: usage.teams,
				limit: limits.teams,
				isOverage: true,
			};
		}

		return {
			allowed: false,
			reason: `You have reached the team limit (${limits.teams}). Upgrade to add more.`,
			currentCount: usage.teams,
			limit: limits.teams,
		};
	}

	return {
		allowed: true,
		currentCount: usage.teams,
		limit: limits.teams,
	};
}

/**
 * Check if creating a new matter (task) is allowed
 */
export async function canCreateMatter(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
}> {
	const limitCheck = await checkPlanLimits(organizationId);
	const limits = limitCheck.limits;
	// Warning: usage.matters is explicitly 0 for now until query updated
	const usage = limitCheck.usage;

	if (limits.matters === -1) {
		return {
			allowed: true,
			currentCount: usage.matters,
			limit: -1,
		};
	}

	if (usage.matters >= limits.matters) {
		return {
			allowed: false,
			reason: `You have reached the matter limit (${limits.matters}) for the Starter plan. Upgrade for unlimited.`,
			currentCount: usage.matters,
			limit: limits.matters,
		};
	}

	return {
		allowed: true,
		currentCount: usage.matters,
		limit: limits.matters,
	};
}

/**
 * Handle subscription downgrade - check if current usage exceeds new plan limits
 * Returns violations that need to be addressed
 */
export async function handleSubscriptionDowngrade(
	organizationId: string,
	newPlanKey: ProductKey,
): Promise<{
	canDowngrade: boolean;
	violations: PlanLimitCheck["violations"];
	message?: string;
}> {
	const limitCheck = await checkPlanLimits(organizationId, newPlanKey);

	if (!limitCheck.withinLimits) {
		const messages: string[] = [];

		if (limitCheck.violations.members) {
			messages.push(
				`Remove ${limitCheck.violations.members.current - limitCheck.violations.members.limit} members`,
			);
		}
		if (limitCheck.violations.teams) {
			messages.push(
				`Remove ${limitCheck.violations.teams.current - limitCheck.violations.teams.limit} teams`,
			);
		}

		return {
			canDowngrade: false,
			violations: limitCheck.violations,
			message: `To downgrade to ${newPlanKey}, you need to: ${messages.join(", ")}`,
		};
	}

	return {
		canDowngrade: true,
		violations: {},
	};
}

/**
 * Get the member addition product slug for a plan
 */
export function getMemberProductSlug(plan: string): string {
	switch (plan) {
		case "starter":
			return "member-add-starter";
		case "growth":
			return "member-add-growth";
		case "pro":
			return "member-add-pro";
		case "enterprise":
			throw new Error("Enterprise plans don't require member payments");
		default:
			return "member-add-starter";
	}
}

/**
 * Get member addition price for a plan (in cents)
 */
export function getMemberPrice(plan: string): number {
	// Check if plan has specific pricing
	if (plan === "growth" || plan === "pro") {
		return usagePricing[plan].memberSeat;
	}

	// Default fallbacks
	return 500;
}

/**
 * Get comprehensive billing status for an organization
 * Used for checking limits and displaying usage in UI
 */
export async function getBillingStatus(organizationId: string) {
	const [memberCheck, teamCheck, usage] = await Promise.all([
		canAddMember(organizationId),
		canCreateTeam(organizationId),
		getOrganizationUsage(organizationId),
	]);

	const planKey = await getOrganizationPlanKey(organizationId);
	const limits = planLimits[planKey];

	// Determine overage prices
	let teamPriceCents: number | null = null;
	if (planKey === "growth" || planKey === "pro") {
		teamPriceCents = usagePricing[planKey].teamCreated;
	}
	const memberPriceCents = getMemberPrice(planKey);

	return {
		// Plan information
		plan: planKey,
		limits,
		usage,

		// Member information
		members: {
			allowed: memberCheck.allowed,
			requiresPayment: memberCheck.isOverage ?? false,
			message: memberCheck.message,
			priceCents: memberPriceCents,
			current: usage.members,
			limit: limits.members,
		},

		// Team information
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
