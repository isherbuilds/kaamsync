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
import { logger } from "~/lib/logger";
import {
	getOrganizationCustomer as getOrgCustomerPrepared,
	getOrganizationSubscription as getOrgSubscriptionPrepared,
} from "~/lib/server/prepared-queries.server";
import type { WebhookPayload } from "./types";

// Removed isWebhookProcessed: rely on recordWebhookEvent's unique constraint for idempotency

/**
 * Attempt to insert a webhook event atomically. Returns true if insert succeeded
 * (this process should proceed), false if another process already inserted the
 * same webhookId (idempotent/ignored).
 */
export async function recordWebhookEvent(
	webhookId: string,
	eventType: string,
	payload: string,
): Promise<boolean> {
	const inserted = await db
		.insert(webhookEventsTable)
		.values({
			id: createId(),
			webhookId,
			eventType,
			payload,
		})
		.onConflictDoNothing({ target: webhookEventsTable.webhookId })
		.returning({ id: webhookEventsTable.id });

	return inserted.length > 0;
}

/**
 * Delete a webhook event by webhookId. Used to clean up a reserved claim if processing fails.
 */
export async function deleteWebhookEvent(webhookId: string): Promise<void> {
	await db
		.delete(webhookEventsTable)
		.where(eq(webhookEventsTable.webhookId, webhookId));
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
	return await db.transaction(async (tx) => {
		// 1. Try to find existing customer by Dodo ID
		let existing = await tx.query.customersTable.findFirst({
			where: eq(customersTable.dodoCustomerId, dodoCustomerId),
		});

		// If no organizationId provided, try to find it from the user's email
		let resolvedOrgId = organizationId ?? "";
		if (!resolvedOrgId && email) {
			// Find user by email
			const user = await tx.query.usersTable.findFirst({
				where: eq(usersTable.email, email),
			});

			if (user) {
				// Find their organization membership
				const membership = await tx.query.membersTable.findFirst({
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
			existing = await tx.query.customersTable.findFirst({
				where: eq(customersTable.organizationId, resolvedOrgId),
			});
		}

		if (existing) {
			// Check if dodoCustomerId is being changed - this could indicate:
			// 1. Customer switched payment accounts (legitimate)
			// 2. Wrong customer record matched by organizationId (data integrity issue)
			const isChangingDodoId =
				existing.dodoCustomerId && existing.dodoCustomerId !== dodoCustomerId;

			if (isChangingDodoId) {
				// Log a warning - this is a significant change that ops should be aware of
				logger.warn(
					"[Billing] dodoCustomerId change detected for existing customer",
					{
						customerId: existing.id,
						organizationId: resolvedOrgId || existing.organizationId,
						previousDodoId: existing.dodoCustomerId,
						newDodoId: dodoCustomerId,
						email,
					},
				);
			}

			// Update if email/name changed; allow organization override when provided
			await tx
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
	// Only consider active subscriptions to avoid matching cancelled historical subscriptions
	// This handles cases where we might have a local record without a dodo ID yet
	if (!existingSubscription) {
		existingSubscription = await db.query.subscriptionsTable.findFirst({
			where: and(
				eq(subscriptionsTable.organizationId, subscriptionData.organizationId),
				eq(subscriptionsTable.productId, subscriptionData.productId),
				eq(subscriptionsTable.status, "active"),
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
	const paymentId = payload.payment_id;
	if (!paymentId) {
		// Payment events are expected to have a payment_id; avoid inserting non-idempotent rows.
		logger.warn("[Billing] Payment event missing payment_id - skipping", {
			customerId,
			organizationId,
			subscriptionId: payload.subscription_id,
		});
		return;
	}

	await db.transaction(async (tx) => {
		// Check for existing payment
		const existing = await tx.query.paymentsTable.findFirst({
			where: eq(paymentsTable.dodoPaymentId, paymentId),
		});

		// Find subscription if exists (used for both update and insert paths)
		let subscriptionId: string | null = null;
		let resolvedOrganizationId = organizationId;
		if (payload.subscription_id) {
			const subscription = await tx.query.subscriptionsTable.findFirst({
				where: eq(
					subscriptionsTable.dodoSubscriptionId,
					payload.subscription_id,
				),
			});
			subscriptionId = subscription?.id ?? null;
			resolvedOrganizationId =
				subscription?.organizationId || resolvedOrganizationId;
		}

		if (existing) {
			// Update relevant fields atomically
			await tx
				.update(paymentsTable)
				.set({
					status,
					amount: payload.total_amount ?? existing.amount,
					currency: payload.currency ?? existing.currency,
				})
				.where(eq(paymentsTable.id, existing.id));
			return;
		}

		await tx.insert(paymentsTable).values({
			id: createId(),
			customerId,
			organizationId: resolvedOrganizationId,
			subscriptionId,
			dodoPaymentId: paymentId,
			amount: payload.total_amount ?? 0,
			currency: payload.currency ?? "USD",
			status,
		});
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
