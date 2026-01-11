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
import { getPlanByProductId } from "~/lib/billing";
import {
	getOrganizationCustomer as getOrgCustomerPrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/server/prepared-queries.server";
import type { WebhookPayload } from "./types";

/**
 * Check if webhook has already been processed (idempotency)
 */
export async function isWebhookProcessed(webhookId: string): Promise<boolean> {
	const existing = await db.query.webhookEventsTable.findFirst({
		where: eq(webhookEventsTable.webhookId, webhookId),
	});
	return !!existing;
}

/**
 * Record webhook event for idempotency
 */
export async function recordWebhookEvent(
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
export async function upsertCustomer(
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
				orderBy: (m, { desc }) => desc(m.createdAt),
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

	if (!resolvedOrgId) {
		throw new Error(
			"Cannot create customer without organization. Provide organizationId or ensure user has membership.",
		);
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
export async function upsertSubscription(
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

	// First, try to find by dodoSubscriptionId (most specific, handles webhook retries)
	let existingSubscription = payload.subscription_id
		? await db.query.subscriptionsTable.findFirst({
				where: eq(
					subscriptionsTable.dodoSubscriptionId,
					payload.subscription_id,
				),
			})
		: null;

	// If not found by dodo ID, try by organizationId + productId
	// This handles cases where we might have a local record without a dodo ID yet
	if (!existingSubscription) {
		existingSubscription = await db.query.subscriptionsTable.findFirst({
			where: and(
				eq(subscriptionsTable.organizationId, subscriptionData.organizationId),
				eq(subscriptionsTable.productId, subscriptionData.productId),
			),
		});
	}

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
export async function recordPayment(
	customerId: string,
	organizationId: string,
	payload: WebhookPayload["data"],
	status: string,
): Promise<void> {
	// Check for existing payment
	const existing = payload.payment_id
		? await db.query.paymentsTable.findFirst({
				where: eq(paymentsTable.dodoPaymentId, payload.payment_id),
			})
		: null;

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
