import { relations } from "drizzle-orm";
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
import {
	accountsTable,
	invitationsTable,
	membersTable,
	organizationsTable,
	sessionsTable,
	usersTable,
	verificationsTable,
} from "./auth-schema";

// --------------------------------------------------------
// 1. RE-EXPORT AUTH TABLES
// --------------------------------------------------------
export {
	organizationsTable,
	usersTable,
	sessionsTable,
	accountsTable,
	verificationsTable,
	membersTable,
	invitationsTable,
};

// --------------------------------------------------------
// 2. DEFINE APP TABLES (Before defining relations)
// --------------------------------------------------------

export const workspacesTable = pgTable(
	"workspaces",
	{
		id: text("id").primaryKey(),

		// Foreign keys
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),

		// Core fields
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull(),
		code: varchar("code", { length: 50 }).notNull(),
		icon: varchar("icon", { length: 255 }),
		description: text("description"),

		// Short ID block tracking
		nextShortId: integer("next_short_id").notNull(),

		// Metadata
		visibility: varchar("visibility", { length: 20 }).notNull(),
		archived: boolean("archived"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),

		...commonColumns,
	},
	(table) => [
		uniqueIndex("workspaces_org_slug_unique").on(table.orgId, table.slug),
		uniqueIndex("workspaces_org_code_unique").on(table.orgId, table.code),
		index("workspaces_org_archived_idx").on(table.orgId, table.archived),
		index("workspaces_org_code_idx").on(table.orgId, table.code),
	],
);

export const workspaceMembershipsTable = pgTable(
	"workspace_memberships",
	{
		id: text("id").primaryKey(),

		// Foreign keys
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspacesTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),

		// Core fields
		role: varchar("role", { length: 50 }).notNull(), // MANAGER, MEMBER, VIEWER
		status: varchar("status", { length: 20 }).notNull(),

		// Permissions (for fine-grained control)
		canCreateTasks: boolean("can_create_tasks"), // Can create task directly
		canCreateRequests: boolean("can_create_requests"), // Can create request (needs approval)
		canApproveRequests: boolean("can_approve_requests"), // Can approve/reject requests
		canManageMembers: boolean("can_manage_members"), // Can add/remove workspace members
		canManageWorkspace: boolean("can_manage_workspace"), // Can edit workspace settings

		...commonColumns,
	},
	(table) => [
		index("workspace_memberships_workspace_idx").on(table.workspaceId),
		index("workspace_memberships_user_idx").on(table.userId),
		index("workspace_memberships_org_user_idx").on(table.orgId, table.userId),
		uniqueIndex("workspace_memberships_workspace_user_unique").on(
			table.workspaceId,
			table.userId,
		),
	],
);

export const statusesTable = pgTable(
	"statuses",
	{
		id: text("id").primaryKey(),

		// Foreign keys
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspacesTable.id, { onDelete: "cascade" }),

		// Core fields
		name: varchar("name", { length: 100 }).notNull(),
		color: varchar("color", { length: 50 }),
		type: varchar("type", { length: 50 }).notNull(), // e.g. 'backlog', 'not_started', 'started', 'completed', 'canceled', 'pending_approval', 'approved', 'rejected'
		position: integer("position").notNull(),

		// Metadata
		isDefault: boolean("is_default"),
		archived: boolean("archived"),
		isRequestStatus: boolean("is_request_status"), // True for REQUEST-specific statuses

		creatorId: text("creator_id").references(() => usersTable.id),

		...commonColumns,
	},
	(table) => [
		index("statuses_workspace_position_idx").on(
			table.workspaceId,
			table.position,
		),
	],
);

export const labelsTable = pgTable(
	"labels",
	{
		id: text("id").primaryKey(),

		// Foreign keys
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),

		// Core fields
		name: varchar("name", { length: 100 }).notNull(),
		color: varchar("color", { length: 50 }),
		description: text("description"),

		// Metadata
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

		// Foreign keys
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspacesTable.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => usersTable.id),
		assigneeId: text("assignee_id").references(() => usersTable.id),
		statusId: text("status_id")
			.notNull()
			.references(() => statusesTable.id),

		// Denormalized for performance (avoids join when displaying matter keys)
		workspaceCode: varchar("workspace_code", { length: 50 }).notNull(),

		// Core content
		title: varchar("title", { length: 500 }).notNull(),
		description: text("description"),

		// Metadata
		type: varchar("type", { length: 50 }).notNull(), // 'request' or 'task'
		priority: smallint("priority").notNull().default(4), // 0=urgent, 1=high, 2=medium, 3=low, 4=none
		source: varchar("source", { length: 50 }),

		// REQUEST approval workflow
		approvalStatus: varchar("approval_status", { length: 50 }), // 'pending', 'approved', 'rejected' (only for request type)
		approvedBy: text("approved_by").references(() => usersTable.id), // Who approved/rejected
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		rejectionReason: text("rejection_reason"),
		convertedToTaskId: text("converted_to_task_id"), // When REQUEST becomes TASK
		convertedFromRequestId: text("converted_from_request_id"), // Parent REQUEST if this is converted TASK

		// Dates
		dueDate: timestamp("due_date", { withTimezone: true }),
		startDate: timestamp("start_date", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }), // Tracking
		estimatedHours: integer("estimated_hours"),
		actualHours: integer("actual_hours"),

		// Archive status
		archived: boolean("archived"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		archivedBy: text("archived_by"),

		...commonColumns,
	},
	(table) => [
		uniqueIndex("matters_workspace_short_id_unique").on(
			table.workspaceId,
			table.shortID,
		),
		// Composite index for fast matter key lookup (GEN-001)
		uniqueIndex("matters_workspace_code_short_id_unique").on(
			table.workspaceCode,
			table.shortID,
		),
		index("matters_short_id_idx").on(table.shortID),
		index("matters_workspace_idx").on(table.workspaceId),
		index("matters_workspace_archived_updated_idx").on(
			table.workspaceId,
			table.archived,
			table.updatedAt,
		),
		index("matters_workspace_status_updated_idx").on(
			table.workspaceId,
			table.statusId,
			table.updatedAt,
		),
		index("matters_assignee_archived_idx").on(table.assigneeId, table.archived),
		index("matters_workspace_priority_archived_idx").on(
			table.workspaceId,
			table.priority,
			table.archived,
		),
		index("matters_due_date_idx").on(table.dueDate),
		index("matters_org_archived_updated_idx").on(
			table.orgId,
			table.archived,
			table.updatedAt,
		),
		index("matters_author_idx").on(table.authorId),
		index("matters_workspace_assignee_archived_idx").on(
			table.workspaceId,
			table.assigneeId,
			table.archived,
		),
		// New indexes for REQUEST/TASK workflow
		index("matters_type_approval_idx").on(table.type, table.approvalStatus),
		index("matters_workspace_type_idx").on(table.workspaceId, table.type),
		index("matters_approved_by_idx").on(table.approvedBy),
		index("matters_converted_to_task_idx").on(table.convertedToTaskId),
		index("matters_converted_from_request_idx").on(
			table.convertedFromRequestId,
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

export const timelinesTable = pgTable(
	"timelines",
	{
		id: text("id").primaryKey(),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id),

		// Event data
		type: varchar("type", { length: 50 }).notNull(), // e.g. 'created', 'comment', 'status_change', 'assigned', etc.
		content: text("content"),

		// Change tracking
		fromStatusId: text("from_status_id"),
		toStatusId: text("to_status_id"),
		fromAssigneeId: text("from_assignee_id"),
		toAssigneeId: text("to_assignee_id"),
		labelId: text("label_id"),
		fromValue: text("from_value"),
		toValue: text("to_value"),

		// Mentions (JSON array of user IDs)
		mentions: text("mentions"),

		// Metadata
		edited: boolean("edited"),
		editedAt: timestamp("edited_at", { withTimezone: true }),

		...commonColumns,
	},
	(table) => [
		index("timelines_matter_created_idx").on(table.matterId, table.createdAt),
		index("timelines_user_idx").on(table.userId),
	],
);

export const attachmentsTable = pgTable(
	"attachments",
	{
		id: text("id").primaryKey(),

		// Foreign keys
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		uploaderId: text("uploader_id")
			.notNull()
			.references(() => usersTable.id),

		// File data
		storageId: text("storage_id").notNull(),
		fileName: varchar("file_name", { length: 500 }).notNull(),
		fileType: varchar("file_type", { length: 100 }).notNull(),
		fileSize: integer("file_size").notNull(),

		...commonColumns,
	},
	(table) => [index("attachments_matter_idx").on(table.matterId)],
);

export const matterViewsTable = pgTable(
	"matter_views",
	{
		// Foreign keys (composite primary key)
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),

		// Tracking
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
		// Foreign keys (composite primary key)
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),

		// Subscription data
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

// Matter Watchers - For oversight without being assignee (e.g., principals watching accountants)
export const matterWatchersTable = pgTable(
	"matter_watchers",
	{
		// Foreign keys (composite primary key)
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),

		// Watcher metadata
		addedBy: text("added_by")
			.notNull()
			.references(() => usersTable.id),
		reason: varchar("reason", { length: 100 }), // e.g., "oversight", "interested_party", "collaborator"
		notifyOnUpdate: boolean("notify_on_update"), // Get notifications for changes
		canComment: boolean("can_comment"), // Can add comments/feedback

		...commonColumns,
	},
	(table) => [
		primaryKey({ columns: [table.matterId, table.userId] }),
		index("matter_watchers_matter_idx").on(table.matterId),
		index("matter_watchers_user_idx").on(table.userId),
		index("matter_watchers_added_by_idx").on(table.addedBy),
	],
);

// --------------------------------------------------------
// 3. DEFINE MERGED RELATIONS (Auth + App)
// --------------------------------------------------------

export const usersTableRelations = relations(usersTable, ({ many }) => ({
	sessionsTables: many(sessionsTable),
	accountsTables: many(accountsTable),
	membersTables: many(membersTable),
	invitationsTables: many(invitationsTable),

	// --- App Relations ---
	workspaceMemberships: many(workspaceMembershipsTable),
	authoredMatters: many(mattersTable, {
		relationName: "authoredMatters",
	}),
	assignedMatters: many(mattersTable, {
		relationName: "assignedMatters",
	}),
	approvedMatters: many(mattersTable, {
		relationName: "approvedMatters",
	}),
	createdStatuses: many(statusesTable),
	createdLabels: many(labelsTable),
	timelines: many(timelinesTable),
	attachments: many(attachmentsTable),
	matterViews: many(matterViewsTable),
	matterSubscriptions: many(matterSubscriptionsTable),
	watchedMatters: many(matterWatchersTable, {
		relationName: "watchedByUser",
	}),
	watchersAdded: many(matterWatchersTable, {
		relationName: "watchersAdded",
	}),
}));

export const sessionsTableRelations = relations(sessionsTable, ({ one }) => ({
	usersTable: one(usersTable, {
		fields: [sessionsTable.userId],
		references: [usersTable.id],
	}),
}));

export const accountsTableRelations = relations(accountsTable, ({ one }) => ({
	usersTable: one(usersTable, {
		fields: [accountsTable.userId],
		references: [usersTable.id],
	}),
}));

export const organizationsTableRelations = relations(
	organizationsTable,
	({ many }) => ({
		membersTables: many(membersTable),
		invitationsTables: many(invitationsTable),

		// --- App Relations ---
		workspaces: many(workspacesTable),
		workspaceMemberships: many(workspaceMembershipsTable),
		labels: many(labelsTable),
		matters: many(mattersTable),
	}),
);

export const membersTableRelations = relations(membersTable, ({ one }) => ({
	organizationsTable: one(organizationsTable, {
		fields: [membersTable.organizationId],
		references: [organizationsTable.id],
	}),
	usersTable: one(usersTable, {
		fields: [membersTable.userId],
		references: [usersTable.id],
	}),
}));

export const invitationsTableRelations = relations(
	invitationsTable,
	({ one }) => ({
		organizationsTable: one(organizationsTable, {
			fields: [invitationsTable.organizationId],
			references: [organizationsTable.id],
		}),
		usersTable: one(usersTable, {
			fields: [invitationsTable.inviterId],
			references: [usersTable.id],
		}),
	}),
);

export const workspacesRelations = relations(
	workspacesTable,
	({ one, many }) => ({
		organization: one(organizationsTable, {
			fields: [workspacesTable.orgId],
			references: [organizationsTable.id],
		}),
		statuses: many(statusesTable),
		matters: many(mattersTable),
		memberships: many(workspaceMembershipsTable),
	}),
);

export const workspaceMembershipsRelations = relations(
	workspaceMembershipsTable,
	({ one }) => ({
		workspace: one(workspacesTable, {
			fields: [workspaceMembershipsTable.workspaceId],
			references: [workspacesTable.id],
		}),
		user: one(usersTable, {
			fields: [workspaceMembershipsTable.userId],
			references: [usersTable.id],
		}),
		organization: one(organizationsTable, {
			fields: [workspaceMembershipsTable.orgId],
			references: [organizationsTable.id],
		}),
	}),
);

export const statusesRelations = relations(statusesTable, ({ one, many }) => ({
	workspace: one(workspacesTable, {
		fields: [statusesTable.workspaceId],
		references: [workspacesTable.id],
	}),
	creator: one(usersTable, {
		fields: [statusesTable.creatorId],
		references: [usersTable.id],
	}),
	matters: many(mattersTable),
}));

export const labelsRelations = relations(labelsTable, ({ one, many }) => ({
	organization: one(organizationsTable, {
		fields: [labelsTable.orgId],
		references: [organizationsTable.id],
	}),
	creator: one(usersTable, {
		fields: [labelsTable.creatorId],
		references: [usersTable.id],
	}),
	matterLabels: many(matterLabelsTable),
}));

export const mattersRelations = relations(mattersTable, ({ one, many }) => ({
	workspace: one(workspacesTable, {
		fields: [mattersTable.workspaceId],
		references: [workspacesTable.id],
	}),
	organization: one(organizationsTable, {
		fields: [mattersTable.orgId],
		references: [organizationsTable.id],
	}),
	author: one(usersTable, {
		fields: [mattersTable.authorId],
		references: [usersTable.id],
		relationName: "authoredMatters",
	}),
	assignee: one(usersTable, {
		fields: [mattersTable.assigneeId],
		references: [usersTable.id],
		relationName: "assignedMatters",
	}),
	status: one(statusesTable, {
		fields: [mattersTable.statusId],
		references: [statusesTable.id],
	}),
	labels: many(matterLabelsTable),
	timelines: many(timelinesTable),
	attachments: many(attachmentsTable),
	views: many(matterViewsTable),
	subscriptions: many(matterSubscriptionsTable),
	watchers: many(matterWatchersTable),
	approver: one(usersTable, {
		fields: [mattersTable.approvedBy],
		references: [usersTable.id],
		relationName: "approvedMatters",
	}),
	convertedTask: one(mattersTable, {
		fields: [mattersTable.convertedToTaskId],
		references: [mattersTable.id],
		relationName: "convertedToTask",
	}),
	convertedFromMatters: many(mattersTable, {
		relationName: "convertedToTask",
	}),
	parentRequest: one(mattersTable, {
		fields: [mattersTable.convertedFromRequestId],
		references: [mattersTable.id],
		relationName: "convertedFromRequest",
	}),
	convertedToMatters: many(mattersTable, {
		relationName: "convertedFromRequest",
	}),
}));

export const matterLabelsRelations = relations(
	matterLabelsTable,
	({ one }) => ({
		matter: one(mattersTable, {
			fields: [matterLabelsTable.matterId],
			references: [mattersTable.id],
		}),
		label: one(labelsTable, {
			fields: [matterLabelsTable.labelId],
			references: [labelsTable.id],
		}),
	}),
);

export const timelinesRelations = relations(timelinesTable, ({ one }) => ({
	matter: one(mattersTable, {
		fields: [timelinesTable.matterId],
		references: [mattersTable.id],
	}),
	user: one(usersTable, {
		fields: [timelinesTable.userId],
		references: [usersTable.id],
	}),
}));

export const attachmentsRelations = relations(attachmentsTable, ({ one }) => ({
	matter: one(mattersTable, {
		fields: [attachmentsTable.matterId],
		references: [mattersTable.id],
	}),
	uploader: one(usersTable, {
		fields: [attachmentsTable.uploaderId],
		references: [usersTable.id],
	}),
}));

export const matterViewsTableRelations = relations(
	matterViewsTable,
	({ one }) => ({
		user: one(usersTable, {
			fields: [matterViewsTable.userId],
			references: [usersTable.id],
		}),
		matter: one(mattersTable, {
			fields: [matterViewsTable.matterId],
			references: [mattersTable.id],
		}),
	}),
);

export const matterSubscriptionsRelations = relations(
	matterSubscriptionsTable,
	({ one }) => ({
		user: one(usersTable, {
			fields: [matterSubscriptionsTable.userId],
			references: [usersTable.id],
		}),
		matter: one(mattersTable, {
			fields: [matterSubscriptionsTable.matterId],
			references: [mattersTable.id],
		}),
	}),
);

export const matterWatchersRelations = relations(
	matterWatchersTable,
	({ one }) => ({
		matter: one(mattersTable, {
			fields: [matterWatchersTable.matterId],
			references: [mattersTable.id],
		}),
		user: one(usersTable, {
			fields: [matterWatchersTable.userId],
			references: [usersTable.id],
			relationName: "watchedByUser",
		}),
		addedByUser: one(usersTable, {
			fields: [matterWatchersTable.addedBy],
			references: [usersTable.id],
			relationName: "watchersAdded",
		}),
	}),
);
