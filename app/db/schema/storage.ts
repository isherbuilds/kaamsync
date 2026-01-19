import {
	bigint,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { organizationsTable, usersTable } from "./auth";
import { mattersTable } from "./matters";

export const attachmentsTable = pgTable(
	"attachments",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		uploaderId: text("uploader_id")
			.notNull()
			.references(() => usersTable.id),
		storageKey: text("storage_key").notNull(),
		fileName: varchar("file_name", { length: 500 }).notNull(),
		fileType: varchar("file_type", { length: 100 }).notNull(),
		fileSize: integer("file_size").notNull(),
		description: text("description"),
		...commonColumns,
	},
	(table) => [
		index("attachments_matter_idx").on(table.matterId),
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
