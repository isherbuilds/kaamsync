import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./auth";

export const subscriptionsTable = pgTable(
	"subscriptions",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		billingCustomerId: text("billing_customer_id").notNull(),
		billingSubscriptionId: text("billing_subscription_id").unique(),

		plan: text("plan").notNull(),
		productId: text("product_id").notNull(),

		status: text("status").notNull(),
		billingInterval: text("billing_interval"),
		preTaxAmount: integer("pre_tax_amount"),

		/** Additional member seats purchased beyond plan's included amount */
		purchasedSeats: integer("purchased_seats").default(0).notNull(),

		/** Additional storage in GB purchased beyond plan's included amount */
		purchasedStorageGB: integer("purchased_storage_gb").default(0).notNull(),

		onDemand: boolean("on_demand").default(false).notNull(),
		paymentFrequencyInterval: text("payment_frequency"),

		previousBillingDate: timestamp("previous_billing_date", {
			withTimezone: true,
		}),
		nextBillingDate: timestamp("next_billing_date", { withTimezone: true }),

		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("subscriptions_billing_customer_idx").on(t.billingCustomerId),
		index("subscriptions_org_idx").on(t.organizationId),
		index("subscriptions_status_idx").on(t.status),
		index("subscriptions_org_status_idx").on(t.organizationId, t.status),
		index("subscriptions_billing_end_idx").on(t.nextBillingDate),
		uniqueIndex("subscriptions_billing_idx").on(t.billingSubscriptionId),
		uniqueIndex("subscriptions_organization_customer_idx").on(
			t.organizationId,
			t.billingCustomerId,
		),
	],
);
