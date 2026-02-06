import {
	bigint,
	doublePrecision,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { organizationsTable, usersTable } from "./auth";

export const attachmentsTable = pgTable(
	"attachments",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		subjectId: text("subject_id").notNull(),
		subjectType: varchar("subject_type", { length: 50 }).notNull(),
		uploaderId: text("uploader_id")
			.notNull()
			.references(() => usersTable.id),
		storageKey: text("storage_key").notNull(),
		publicUrl: text("public_url"),
		fileName: varchar("file_name", { length: 500 }).notNull(),
		fileType: varchar("file_type", { length: 100 }).notNull(),
		fileSize: bigint("file_size", { mode: "number" }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("attachments_subject_idx").on(table.subjectType, table.subjectId),
		index("attachments_org_idx").on(table.orgId),
		index("attachments_uploader_idx").on(table.uploaderId),
	],
);

export const storageUsageCacheTable = pgTable("storage_usage_cache", {
	orgId: text("org_id")
		.primaryKey()
		.references(() => organizationsTable.id, { onDelete: "cascade" }),
	totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(0),
	fileCount: integer("file_count").notNull().default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
