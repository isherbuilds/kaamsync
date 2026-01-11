import { eq } from "drizzle-orm";
import { db } from "~/db";
import { membersTable, usersTable } from "~/db/schema";
import { getCustomerByDodoId } from "~/lib/server/prepared-queries.server";

// Re-export cache functions
export {
	getCacheStats,
	getOrganizationUsage,
	invalidateAllOrganizationCaches,
	invalidateUsageCache,
} from "./billing/cache";
// Re-export limits functions
export {
	canAddMember,
	canCreateMatter,
	canCreateTeam,
	checkPlanLimits,
	getBillingStatus,
	getMemberCount,
	getMemberPrice,
	getMemberProductSlug,
	getOrganizationPlan,
	getOrganizationPlanKey,
	handleSubscriptionDowngrade,
	type PlanLimitCheck,
} from "./billing/limits";
// Re-export repository functions
export {
	getOrganizationCustomer,
	getOrganizationPayments,
	getOrganizationSubscription,
	linkCustomerToOrganization,
	recordPayment,
	recordWebhookEvent,
	upsertCustomer,
	upsertSubscription,
} from "./billing/repository";
// Re-export types
export type { PlanUsage, WebhookPayload } from "./billing/types";

// Import what we need for the webhook handler in this file
import {
	deleteWebhookEvent,
	recordPayment,
	recordWebhookEvent,
	upsertCustomer,
	upsertSubscription,
} from "./billing/repository";
import type { WebhookPayload } from "./billing/types";

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
import { createHash } from "crypto";

export async function handleBillingWebhook(
	payload: WebhookPayload,
): Promise<void> {
	const eventType = payload.type || payload.event_type || "";
	const payloadTimestamp =
		typeof payload.timestamp === "object"
			? payload.timestamp.toISOString()
			: payload.timestamp;
	// Use hash of full payload for guaranteed uniqueness
	const payloadHash = createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex")
		.substring(0, 16);
	const generatedWebhookId = `${eventType}_${payloadTimestamp}_${payloadHash}`;

	// Attempt to claim webhook idempotency atomically. If another
	// process has already claimed this webhook, exit early.
	const claimed = await recordWebhookEvent(
		generatedWebhookId,
		eventType,
		JSON.stringify(payload),
	);
	if (!claimed) return;

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
	} catch (error) {
		console.error(`[Billing] Webhook processing error:`, error);
		// If processing failed, remove the claimed webhook event so it can be retried
		try {
			await deleteWebhookEvent(generatedWebhookId);
		} catch (deleteErr) {
			// Log cleanup failure as critical - this leaves the webhook claim locked
			console.error(
				"[Billing] CRITICAL: Failed to clean up webhook claim. Manual intervention may be required.",
				{
					webhookId: generatedWebhookId,
					originalError: error,
					cleanupError: deleteErr,
				},
			);
			// In production, emit alert/metric here to notify ops team
			// Example: Sentry.captureException(deleteErr, { tags: { critical: true } });
		}
		throw error;
	}
}
