import { relations } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./auth-schema";

// ... (existing usage tables remain unchanged)

export const usageCacheTable = pgTable(
	"usage_cache",
	{
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		metric: text("metric").notNull(),
		count: integer("count").notNull().default(0),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.orgId, table.metric] }),
		index("usage_cache_org_idx").on(table.orgId),
	],
);

export const usageLedgerTable = pgTable(
	"usage_ledger",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		metric: text("metric").notNull(),
		delta: integer("delta").notNull(),
		reason: text("reason").notNull(),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.defaultNow()
			.notNull(),
		metadata: text("metadata"),
	},
	(table) => [
		index("usage_ledger_org_metric_idx").on(table.orgId, table.metric),
		index("usage_ledger_timestamp_idx").on(table.timestamp),
	],
);

export const orgLimitsTable = pgTable(
	"org_limits",
	{
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		metric: text("metric").notNull(),
		value: integer("value").notNull(),
		source: text("source").notNull().default("manual"),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.orgId, table.metric] })],
);

export const usageCacheRelations = relations(usageCacheTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [usageCacheTable.orgId],
		references: [organizationsTable.id],
	}),
}));

export const usageLedgerRelations = relations(usageLedgerTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [usageLedgerTable.orgId],
		references: [organizationsTable.id],
	}),
}));

export const orgLimitsRelations = relations(orgLimitsTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [orgLimitsTable.orgId],
		references: [organizationsTable.id],
	}),
}));
