import {
	boolean,
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { organizationsTable, usersTable } from "./auth";
import { mattersTable } from "./matters";

export const commentsTable = pgTable(
	"comments",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		creatorId: text("creator_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		body: text("body").notNull(),
		edited: boolean("edited").default(false),
		...commonColumns,
	},
	(table) => [
		index("comments_matter_idx").on(table.matterId),
		index("comments_matter_created_idx").on(table.matterId, table.createdAt),
		index("comments_creator_idx").on(table.creatorId),
	],
);

export const emojisTable = pgTable(
	"emojis",
	{
		id: text("id").primaryKey(),
		value: varchar("value", { length: 50 }).notNull(),
		annotation: varchar("annotation", { length: 100 }),
		subjectId: text("subject_id").notNull(),
		subjectType: varchar("subject_type", { length: 50 }).notNull(),
		creatorId: text("creator_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		index("emojis_subject_idx").on(table.subjectType, table.subjectId),
		unique("emojis_subject_creator_value_unique").on(
			table.subjectId,
			table.creatorId,
			table.value,
		),
	],
);

export const matterNotificationsTable = pgTable(
	"matter_notifications",
	{
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		subscribed: boolean("subscribed").default(true),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.matterId] }),
		index("matter_notifications_user_subscribed_idx").on(
			table.userId,
			table.subscribed,
		),
	],
);
