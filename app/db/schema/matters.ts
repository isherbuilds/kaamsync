import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { organizationsTable, usersTable } from "./auth";
import { statusesTable, teamsTable } from "./teams";

export const labelsTable = pgTable(
	"labels",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		color: varchar("color", { length: 50 }),
		description: text("description"),
		archived: boolean("archived"),
		creatorId: text("creator_id").references(() => usersTable.id),
		...commonColumns,
	},
	(table) => [
		uniqueIndex("labels_org_name_unique").on(table.orgId, table.name),
		index("labels_org_idx").on(table.orgId),
		index("labels_org_archived_idx").on(table.orgId, table.archived),
	],
);

export const mattersTable = pgTable(
	"matters",
	{
		id: text("id").primaryKey(),
		shortID: integer("short_id").notNull(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		teamId: text("team_id")
			.notNull()
			.references(() => teamsTable.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => usersTable.id),
		assigneeId: text("assignee_id").references(() => usersTable.id),
		statusId: text("status_id")
			.notNull()
			.references(() => statusesTable.id),
		teamCode: varchar("team_code", { length: 50 }).notNull(),
		title: varchar("title", { length: 500 }).notNull(),
		description: text("description"),
		type: varchar("type", { length: 50 }).notNull(),
		priority: smallint("priority").notNull().default(4),
		source: varchar("source", { length: 50 }),
		approvedBy: text("approved_by").references(() => usersTable.id),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		rejectionReason: text("rejection_reason"),
		dueDate: timestamp("due_date", { withTimezone: true }),
		startDate: timestamp("start_date", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		estimatedHours: integer("estimated_hours"),
		actualHours: integer("actual_hours"),
		archived: boolean("archived"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		archivedBy: text("archived_by").references(() => usersTable.id),
		...commonColumns,
	},
	(table) => [
		uniqueIndex("matters_team_short_id_unique").on(table.teamId, table.shortID),
		uniqueIndex("matters_team_code_short_id_unique").on(
			table.teamCode,
			table.shortID,
		),
		index("matters_short_id_idx").on(table.shortID),
		index("matters_team_idx").on(table.teamId),
		index("matters_team_archived_updated_idx").on(
			table.teamId,
			table.archived,
			table.updatedAt,
		),
		index("matters_team_status_updated_idx").on(
			table.teamId,
			table.statusId,
			table.updatedAt,
		),
		index("matters_team_assignee_archived_idx").on(
			table.teamId,
			table.assigneeId,
			table.archived,
		),
		index("matters_team_priority_archived_idx").on(
			table.teamId,
			table.priority,
			table.archived,
		),
		index("matters_assignee_archived_idx").on(table.assigneeId, table.archived),
		index("matters_author_idx").on(table.authorId),
		index("matters_author_type_archived_idx").on(
			table.authorId,
			table.type,
			table.archived,
		),
		index("matters_org_archived_updated_idx").on(
			table.orgId,
			table.archived,
			table.updatedAt,
		),
		index("matters_due_date_idx").on(table.dueDate),
		index("matters_due_date_archived_idx").on(table.dueDate, table.archived),
		index("matters_team_type_idx").on(table.teamId, table.type),
		index("matters_approved_by_idx").on(table.approvedBy),
		index("matters_type_approved_by_idx").on(table.type, table.approvedBy),
		index("matters_team_list_covering_idx").on(
			table.teamId,
			table.archived,
			table.priority,
			table.updatedAt,
			table.statusId,
			table.assigneeId,
		),
	],
);

export const matterLabelsTable = pgTable(
	"matter_labels",
	{
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		labelId: text("label_id")
			.notNull()
			.references(() => labelsTable.id, { onDelete: "cascade" }),
		...commonColumns,
	},
	(table) => [
		primaryKey({ columns: [table.matterId, table.labelId] }),
		index("matter_labels_matter_idx").on(table.matterId),
		index("matter_labels_label_idx").on(table.labelId),
	],
);

export const matterViewsTable = pgTable(
	"matter_views",
	{
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull(),
		lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
		...commonColumns,
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.matterId] }),
		index("matter_views_user_activity_idx").on(
			table.userId,
			table.lastActivityAt,
		),
	],
);

export const matterSubscriptionsTable = pgTable(
	"matter_subscriptions",
	{
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		subscribed: boolean("subscribed"),
		reason: varchar("reason", { length: 50 }),
		...commonColumns,
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.matterId] }),
		index("matter_subscriptions_user_subscribed_idx").on(
			table.userId,
			table.subscribed,
		),
	],
);

export const matterWatchersTable = pgTable(
	"matter_watchers",
	{
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		addedBy: text("added_by")
			.notNull()
			.references(() => usersTable.id),
		reason: varchar("reason", { length: 100 }),
		notifyOnUpdate: boolean("notify_on_update"),
		canComment: boolean("can_comment"),
		...commonColumns,
	},
	(table) => [
		primaryKey({ columns: [table.matterId, table.userId] }),
		index("matter_watchers_matter_idx").on(table.matterId),
		index("matter_watchers_user_idx").on(table.userId),
		index("matter_watchers_added_by_idx").on(table.addedBy),
	],
);
