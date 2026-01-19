import {
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
		billingCustomerId: text("customer_id").notNull(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		dodoSubscriptionId: text("dodo_subscription_id").unique(),
		productId: text("product_id").notNull(),
		planKey: text("plan_key"),
		status: text("status").notNull(),
		billingInterval: text("billing_interval"),
		amount: integer("amount"),
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
			.notNull(),
	},
	(t) => [
		index("subscriptions_billing_customer_idx").on(t.billingCustomerId),
		index("subscriptions_org_idx").on(t.organizationId),
		index("subscriptions_status_idx").on(t.status),
		uniqueIndex("subscriptions_dodo_idx").on(t.dodoSubscriptionId),
		index("subscriptions_org_status_idx").on(t.organizationId, t.status),
		index("subscriptions_period_end_idx").on(t.currentPeriodEnd),
	],
);
