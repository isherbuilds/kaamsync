import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./auth-schema";

// --------------------------------------------------------
// BILLING TABLES - Dodo Payments Integration
// --------------------------------------------------------

/**
 * Customers table - Links organizations to Dodo Payments customers
 * Each organization has one customer record for billing
 */
export const customersTable = pgTable(
	"customers",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.unique()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		dodoCustomerId: text("dodo_customer_id").unique(),
		email: text("email").notNull(),
		name: text("name"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("customers_org_idx").on(t.organizationId),
		uniqueIndex("customers_dodo_idx").on(t.dodoCustomerId),
		// Add index for email lookups (webhook processing optimization)
		index("customers_email_idx").on(t.email),
	],
);

/**
 * Subscriptions table - Tracks active subscriptions
 */
export const subscriptionsTable = pgTable(
	"subscriptions",
	{
		id: text("id").primaryKey(),
		customerId: text("customer_id")
			.notNull()
			.references(() => customersTable.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		dodoSubscriptionId: text("dodo_subscription_id").unique(),
		productId: text("product_id").notNull(),
		planKey: text("plan_key"), // starter, growth, pro, enterprise - resolved from productId
		status: text("status").notNull(), // active, cancelled, on_hold, expired, failed
		billingInterval: text("billing_interval"), // monthly, yearly
		amount: integer("amount"), // in cents
		currency: text("currency").default("USD"),
		currentPeriodStart: timestamp("current_period_start", {
			withTimezone: true,
		}),
		currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("subscriptions_customer_idx").on(t.customerId),
		index("subscriptions_org_idx").on(t.organizationId),
		index("subscriptions_status_idx").on(t.status),
		uniqueIndex("subscriptions_dodo_idx").on(t.dodoSubscriptionId),
		// Add composite index for active subscription queries (performance optimization)
		index("subscriptions_org_status_idx").on(t.organizationId, t.status),
		// Add index for billing period queries
		index("subscriptions_period_end_idx").on(t.currentPeriodEnd),
	],
);

/**
 * Payments table - Records individual payments
 */
export const paymentsTable = pgTable(
	"payments",
	{
		id: text("id").primaryKey(),
		customerId: text("customer_id")
			.notNull()
			.references(() => customersTable.id, { onDelete: "cascade" }),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		subscriptionId: text("subscription_id").references(
			() => subscriptionsTable.id,
			{ onDelete: "set null" },
		),
		dodoPaymentId: text("dodo_payment_id").unique(),
		amount: integer("amount").notNull(), // in cents
		currency: text("currency").default("USD").notNull(),
		status: text("status").notNull(), // succeeded, failed, pending, cancelled
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("payments_customer_idx").on(t.customerId),
		index("payments_org_idx").on(t.organizationId),
		index("payments_subscription_idx").on(t.subscriptionId),
		uniqueIndex("payments_dodo_idx").on(t.dodoPaymentId),
		// Add composite index for payment history queries (org + created_at)
		index("payments_org_created_idx").on(t.organizationId, t.createdAt),
		// Add index for status filtering
		index("payments_status_idx").on(t.status),
	],
);

/**
 * Webhook events table - Idempotent webhook processing
 */
export const webhookEventsTable = pgTable(
	"webhook_events",
	{
		id: text("id").primaryKey(),
		webhookId: text("webhook_id").notNull().unique(),
		eventType: text("event_type").notNull(),
		processedAt: timestamp("processed_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		payload: text("payload"), // JSON stringified
	},
	(t) => [
		uniqueIndex("webhook_events_webhook_id_idx").on(t.webhookId),
		index("webhook_events_type_idx").on(t.eventType),
	],
);

// --------------------------------------------------------
// BILLING RELATIONS
// --------------------------------------------------------

export const customersTableRelations = relations(
	customersTable,
	({ one, many }) => ({
		organization: one(organizationsTable, {
			fields: [customersTable.organizationId],
			references: [organizationsTable.id],
		}),
		subscriptions: many(subscriptionsTable),
		payments: many(paymentsTable),
	}),
);

export const subscriptionsTableRelations = relations(
	subscriptionsTable,
	({ one, many }) => ({
		customer: one(customersTable, {
			fields: [subscriptionsTable.customerId],
			references: [customersTable.id],
		}),
		organization: one(organizationsTable, {
			fields: [subscriptionsTable.organizationId],
			references: [organizationsTable.id],
		}),
		payments: many(paymentsTable),
	}),
);

export const paymentsTableRelations = relations(paymentsTable, ({ one }) => ({
	customer: one(customersTable, {
		fields: [paymentsTable.customerId],
		references: [customersTable.id],
	}),
	organization: one(organizationsTable, {
		fields: [paymentsTable.organizationId],
		references: [organizationsTable.id],
	}),
	subscription: one(subscriptionsTable, {
		fields: [paymentsTable.subscriptionId],
		references: [subscriptionsTable.id],
	}),
}));
