import { createId } from "@paralleldrive/cuid2";
import { count, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import {
	customersTable,
	membersTable,
	paymentsTable,
	subscriptionsTable,
	teamsTable,
	usersTable,
	webhookEventsTable,
} from "~/db/schema";
import {
	getPlanByProductId,
	type ProductKey,
	planLimits,
	usagePricing,
} from "~/lib/billing";

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

	await db
		.insert(subscriptionsTable)
		.values({ id: createId(), ...subscriptionData })
		.onConflictDoUpdate({
			target: subscriptionsTable.dodoSubscriptionId,
			set: subscriptionData,
		});
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
 * Main webhook handler - processes all Dodo Payments events (optimized with batching)
 */
export async function handleBillingWebhook(
	payload: WebhookPayload,
): Promise<void> {
	const eventType = payload.type || payload.event_type || "";
	const timestamp =
		typeof payload.timestamp === "object"
			? payload.timestamp.toISOString()
			: payload.timestamp;
	const webhookId = `${eventType}_${timestamp}_${payload.data?.subscription_id ?? payload.data?.payment_id ?? ""}`;

	// Idempotency check
	if (await isWebhookProcessed(webhookId)) {
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
			// Batch customer lookup and user/membership queries
			const [existingCustomer, user, membership] = await Promise.all([
				db.query.customersTable.findFirst({
					where: eq(customersTable.dodoCustomerId, customer.customer_id),
				}),
				customer.email ? db.query.usersTable.findFirst({
					where: eq(usersTable.email, customer.email),
				}) : Promise.resolve(null),
				// We'll get membership after we have user
				Promise.resolve(null)
			]);

			// Get membership if we found a user
			const membershipResult = user ? await db.query.membersTable.findFirst({
				where: eq(membersTable.userId, user.id),
			}) : null;

			if (existingCustomer) {
				customerId = existingCustomer.id;
				organizationId =
					organizationId || existingCustomer.organizationId || "";
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

		// Process event types with batched operations where possible
		switch (eventType) {
			case "subscription.active":
			case "subscription.renewed":
			case "subscription.updated":
				if (customerId) {
					await upsertSubscription(customerId, organizationId, data, "active");
				}
				break;
			case "subscription.on_hold":
				if (customerId) {
					await upsertSubscription(customerId, organizationId, data, "on_hold");
				}
				break;
			case "subscription.cancelled":
				if (customerId) {
					await upsertSubscription(
						customerId,
						organizationId,
						data,
						"cancelled",
					);
				}
				break;
			case "subscription.failed":
				if (customerId) {
					await upsertSubscription(customerId, organizationId, data, "failed");
				}
				break;
			case "subscription.expired":
				if (customerId) {
					await upsertSubscription(customerId, organizationId, data, "expired");
				}
				break;
			case "payment.succeeded":
				if (customerId) {
					await recordPayment(customerId, organizationId, data, "succeeded");

					// Handle member addition payments
					if (data.metadata?.action === "add_member") {
						console.log(
							`[Billing] Member addition payment succeeded: org=${organizationId}, email=${data.metadata.email}`,
						);
						// Member is added in the payment success handler, not here
						// This is just for record keeping
					}
				}
				break;
			case "payment.failed":
				if (customerId) {
					await recordPayment(customerId, organizationId, data, "failed");
				}
				break;
			case "payment.processing":
				if (customerId) {
					await recordPayment(customerId, organizationId, data, "processing");
				}
				break;
			case "payment.cancelled":
				if (customerId) {
					await recordPayment(customerId, organizationId, data, "cancelled");
				}
				break;
			default:
				// Ignore unhandled event types
				break;
		}

		await recordWebhookEvent(webhookId, eventType, JSON.stringify(payload));
	} catch (error) {
		console.error(`[Billing] Webhook processing error:`, error);
		throw error;
	}
}

/**
 * Get organization's current subscription
 * Query directly by organizationId on subscriptions table (more reliable)
 */
export async function getOrganizationSubscription(organizationId: string) {
	// Query subscriptions directly by organizationId - this is more reliable
	// since webhooks now store organizationId directly on subscriptions
	const subscription = await db.query.subscriptionsTable.findFirst({
		where: eq(subscriptionsTable.organizationId, organizationId),
		orderBy: (s, { desc }) => desc(s.createdAt),
	});

	return subscription;
}

/**
 * Get organization's billing customer
 */
export async function getOrganizationCustomer(organizationId: string) {
	return db.query.customersTable.findFirst({
		where: eq(customersTable.organizationId, organizationId),
	});
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
	// storageGb: number; // Add when file storage is implemented
}

export interface PlanLimitCheck {
	withinLimits: boolean;
	usage: PlanUsage;
	limits: (typeof planLimits)[ProductKey];
	violations: {
		members?: { current: number; limit: number };
		teams?: { current: number; limit: number };
		// storage?: { current: number; limit: number };
	};
}

// Simple in-memory cache for organization usage (5-minute TTL)
const usageCache = new Map<string, { data: PlanUsage; expires: number }>();
const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current usage for an organization (optimized with single query and caching)
 */
export async function getOrganizationUsage(
	organizationId: string,
): Promise<PlanUsage> {
	// Check cache first
	const cached = usageCache.get(organizationId);
	if (cached && cached.expires > Date.now()) {
		return cached.data;
	}

	// Use a single query with subqueries for better performance
	const result = await db.execute(sql`
		SELECT 
			(SELECT COUNT(*) FROM ${membersTable} WHERE organization_id = ${organizationId}) as member_count,
			(SELECT COUNT(*) FROM ${teamsTable} WHERE org_id = ${organizationId}) as team_count
	`);
	
	const row = result.rows[0];
	const usage = {
		members: Number(row?.member_count ?? 0),
		teams: Number(row?.team_count ?? 0),
	};

	// Cache the result
	usageCache.set(organizationId, {
		data: usage,
		expires: Date.now() + USAGE_CACHE_TTL,
	});

	return usage;
}

/**
 * Invalidate usage cache for an organization (call after membership/team changes)
 */
export function invalidateUsageCache(organizationId: string): void {
	usageCache.delete(organizationId);
}

/**
 * Check if an organization's usage is within plan limits
 * @param organizationId - The organization ID
 * @param planKey - The plan to check against (defaults to current subscription plan)
 */
export async function checkPlanLimits(
	organizationId: string,
	planKey?: ProductKey,
): Promise<PlanLimitCheck> {
	// Get current plan if not specified - use stored planKey for reliability
	const effectivePlan: ProductKey =
		planKey ?? (await getOrganizationPlanKey(organizationId));

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

	return {
		withinLimits,
		usage,
		limits,
		violations,
	};
}

/**
 * Get the effective plan key for an organization
 * Uses stored planKey first (most reliable), then falls back to productId lookup
 */
export async function getOrganizationPlanKey(
	organizationId: string,
): Promise<ProductKey> {
	const subscription = await getOrganizationSubscription(organizationId);

	// No subscription = starter plan
	if (!subscription) return "starter";

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
 * Check if adding a new member would exceed plan limits
 * For Pay-Per-Action billing: always allowed, but may require payment
 */
export async function canAddMember(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
	message?: string;
}> {
	const planKey = await getOrganizationPlanKey(organizationId);
	const limits = planLimits[planKey];
	const usage = await getOrganizationUsage(organizationId);

	// Unlimited members (enterprise)
	if (limits.members === -1) {
		return {
			allowed: true,
			currentCount: usage.members,
			limit: -1,
		};
	}

	// Pay-Per-Action billing: always allowed, but may require payment
	const isOverLimit = usage.members >= limits.members;

	return {
		allowed: true, // Always allowed with Pay-Per-Action
		currentCount: usage.members,
		limit: limits.members,
		isOverage: isOverLimit,
		message: isOverLimit
			? `Adding this member will cost $5`
			: `This member is included in your ${planKey} plan`,
	};
}

/**
 * Get current member count and plan limit for an organization
 */
export async function getMemberCount(organizationId: string): Promise<{
	currentMembers: number;
	planLimit: number;
	plan: string;
}> {
	const planKey = await getOrganizationPlanKey(organizationId);
	const limits = planLimits[planKey];
	const usage = await getOrganizationUsage(organizationId);

	return {
		currentMembers: usage.members,
		planLimit: limits.members,
		plan: planKey,
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
 * Check if creating a new team would exceed plan limits
 * For usage-based plans (growth, pro), allows overage and tracks for billing
 * For starter/enterprise, enforces hard limits
 */
export async function canCreateTeam(organizationId: string): Promise<{
	allowed: boolean;
	reason?: string;
	currentCount: number;
	limit: number;
	isOverage?: boolean;
}> {
	const planKey = await getOrganizationPlanKey(organizationId);
	const limits = planLimits[planKey];
	const usage = await getOrganizationUsage(organizationId);

	// Unlimited teams
	if (limits.teams === -1) {
		return {
			allowed: true,
			currentCount: usage.teams,
			limit: -1,
		};
	}

	// Usage-based plans (growth, pro) allow overages with metered billing
	const isUsageBasedPlan = planKey === "growth" || planKey === "pro";
	const isOverLimit = usage.teams >= limits.teams;

	if (isUsageBasedPlan) {
		// Always allow for usage-based plans - overages are billed
		return {
			allowed: true,
			currentCount: usage.teams,
			limit: limits.teams,
			isOverage: isOverLimit,
		};
	}

	// Starter plan: hard limit enforcement
	const allowed = usage.teams < limits.teams;
	return {
		allowed,
		reason: allowed
			? undefined
			: `Your ${planKey} plan allows up to ${limits.teams} teams. Upgrade to add more.`,
		currentCount: usage.teams,
		limit: limits.teams,
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
