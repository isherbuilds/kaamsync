import { relations } from "drizzle-orm";
import {
	bigint,
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

// --------------------------------------------------------
// 1. AUTH & ORGANIZATION TABLES
// --------------------------------------------------------

export const usersTable = pgTable("users_table", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const sessionsTable = pgTable(
	"sessions_table",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		activeOrganizationId: text("active_organization_id"),
	},
	(table) => [index("sessionsTable_userId_idx").on(table.userId)],
);

export const accountsTable = pgTable(
	"accounts_table",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("accountsTable_userId_idx").on(table.userId)],
);

export const verificationsTable = pgTable(
	"verifications_table",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("verificationsTable_identifier_idx").on(table.identifier)],
);

export const organizationsTable = pgTable(
	"organizations_table",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		slug: text("slug").notNull(),
		logo: text("logo"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		metadata: text("metadata"),
	},
	(table) => [uniqueIndex("organizationsTable_slug_uidx").on(table.slug)],
);

export const membersTable = pgTable(
	"members_table",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		role: text("role").default("member").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("membersTable_organizationId_idx").on(table.organizationId),
		index("membersTable_userId_idx").on(table.userId),
		uniqueIndex("membersTable_org_user_uidx").on(
			table.organizationId,
			table.userId,
		),
	],
);

export const invitationsTable = pgTable(
	"invitations_table",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role"),
		status: text("status").default("pending").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		inviterId: text("inviter_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("invitationsTable_organizationId_idx").on(table.organizationId),
		index("invitationsTable_email_idx").on(table.email),
	],
);

// --------------------------------------------------------
// 2. BILLING TABLES (Dodo Payments)
// --------------------------------------------------------

export const customersTable = pgTable(
	"customers",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id")
			.notNull()
			.unique()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		dodoCustomerId: text("dodo_customer_id"),
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
		uniqueIndex("customers_dodo_org_idx").on(
			t.dodoCustomerId,
			t.organizationId,
		),
		index("customers_email_idx").on(t.email),
	],
);

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
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(t) => [
		index("subscriptions_customer_idx").on(t.customerId),
		index("subscriptions_org_idx").on(t.organizationId),
		index("subscriptions_status_idx").on(t.status),
		uniqueIndex("subscriptions_dodo_idx").on(t.dodoSubscriptionId),
		index("subscriptions_org_status_idx").on(t.organizationId, t.status),
		index("subscriptions_period_end_idx").on(t.currentPeriodEnd),
	],
);

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
			{
				onDelete: "set null",
			},
		),
		dodoPaymentId: text("dodo_payment_id").unique(),
		amount: integer("amount").notNull(),
		currency: text("currency").default("USD").notNull(),
		status: text("status").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("payments_customer_idx").on(t.customerId),
		index("payments_org_idx").on(t.organizationId),
		index("payments_subscription_idx").on(t.subscriptionId),
		uniqueIndex("payments_dodo_idx").on(t.dodoPaymentId),
		index("payments_org_created_idx").on(t.organizationId, t.createdAt),
		index("payments_status_idx").on(t.status),
	],
);

export const webhookEventsTable = pgTable(
	"webhook_events",
	{
		id: text("id").primaryKey(),
		webhookId: text("webhook_id").notNull().unique(),
		eventType: text("event_type").notNull(),
		processedAt: timestamp("processed_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		payload: text("payload"),
	},
	(t) => [
		uniqueIndex("webhook_events_webhook_id_idx").on(t.webhookId),
		index("webhook_events_type_idx").on(t.eventType),
	],
);

// --------------------------------------------------------
// 3. APPLICATION DOMAIN TABLES
// --------------------------------------------------------

export const teamsTable = pgTable(
	"teams",
	{
		id: text("id").primaryKey(),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull(),
		code: varchar("code", { length: 50 }).notNull(),
		icon: varchar("icon", { length: 255 }),
		description: text("description"),
		nextShortId: integer("next_short_id").notNull(),
		visibility: varchar("visibility", { length: 20 }).notNull(),
		archived: boolean("archived"),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		...commonColumns,
	},
	(table) => [
		uniqueIndex("teams_org_slug_unique").on(table.orgId, table.slug),
		uniqueIndex("teams_org_code_unique").on(table.orgId, table.code),
		index("teams_org_archived_idx").on(table.orgId, table.archived),
		index("teams_org_code_idx").on(table.orgId, table.code),
	],
);

export const teamMembershipsTable = pgTable(
	"team_memberships",
	{
		id: text("id").primaryKey(),
		teamId: text("team_id")
			.notNull()
			.references(() => teamsTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		orgId: text("org_id")
			.notNull()
			.references(() => organizationsTable.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 50 }).notNull(),
		status: varchar("status", { length: 20 }).notNull(),
		canCreateTasks: boolean("can_create_tasks"),
		canCreateRequests: boolean("can_create_requests"),
		canApproveRequests: boolean("can_approve_requests"),
		canManageMembers: boolean("can_manage_members"),
		canManageTeam: boolean("can_manage_team"),
		...commonColumns,
	},
	(table) => [
		index("team_memberships_team_idx").on(table.teamId),
		index("team_memberships_user_idx").on(table.userId),
		index("team_memberships_org_user_idx").on(table.orgId, table.userId),
		uniqueIndex("team_memberships_team_user_unique").on(
			table.teamId,
			table.userId,
		),
	],
);

export const statusesTable = pgTable(
	"statuses",
	{
		id: text("id").primaryKey(),
		teamId: text("team_id")
			.notNull()
			.references(() => teamsTable.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 100 }).notNull(),
		color: varchar("color", { length: 50 }),
		type: varchar("type", { length: 50 }).notNull(),
		position: integer("position").notNull(),
		isDefault: boolean("is_default"),
		archived: boolean("archived"),
		creatorId: text("creator_id").references(() => usersTable.id),
		...commonColumns,
	},
	(table) => [
		index("statuses_team_position_idx").on(table.teamId, table.position),
	],
);

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
		index("matters_assignee_archived_idx").on(table.assigneeId, table.archived),
		index("matters_due_date_idx").on(table.dueDate),
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
		type: varchar("type", { length: 50 }).notNull(),
		content: text("content"),
		fromStatusId: text("from_status_id"),
		toStatusId: text("to_status_id"),
		fromAssigneeId: text("from_assignee_id"),
		toAssigneeId: text("to_assignee_id"),
		labelId: text("label_id"),
		fromValue: text("from_value"),
		toValue: text("to_value"),
		mentions: text("mentions"),
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
	],
);

export const pushSubscriptionsTable = pgTable(
	"push_subscriptions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		userAgent: text("user_agent"),
		...commonColumns,
	},
	(table) => [
		index("push_subscriptions_user_idx").on(table.userId),
		uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
	],
);

// --------------------------------------------------------
// 4. CONSOLIDATED RELATIONS
// --------------------------------------------------------

export const usersTableRelations = relations(usersTable, ({ many }) => ({
	sessions: many(sessionsTable),
	accounts: many(accountsTable),
	members: many(membersTable),
	invitations: many(invitationsTable),
	teamMemberships: many(teamMembershipsTable),
	authoredMatters: many(mattersTable, { relationName: "authoredMatters" }),
	assignedMatters: many(mattersTable, { relationName: "assignedMatters" }),
	approvedMatters: many(mattersTable, { relationName: "approvedMatters" }),
	createdStatuses: many(statusesTable),
	createdLabels: many(labelsTable),
	timelines: many(timelinesTable),
	attachments: many(attachmentsTable),
	matterViews: many(matterViewsTable),
	matterSubscriptions: many(matterSubscriptionsTable),
	watchedMatters: many(matterWatchersTable, { relationName: "watchedByUser" }),
	watchersAdded: many(matterWatchersTable, { relationName: "watchersAdded" }),
	pushSubscriptions: many(pushSubscriptionsTable),
}));

export const sessionsTableRelations = relations(sessionsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [sessionsTable.userId],
		references: [usersTable.id],
	}),
}));

export const accountsTableRelations = relations(accountsTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [accountsTable.userId],
		references: [usersTable.id],
	}),
}));

export const organizationsTableRelations = relations(
	organizationsTable,
	({ one, many }) => ({
		members: many(membersTable),
		invitations: many(invitationsTable),
		teams: many(teamsTable),
		teamMemberships: many(teamMembershipsTable),
		labels: many(labelsTable),
		matters: many(mattersTable),
		customer: one(customersTable), // Billing link
		subscriptions: many(subscriptionsTable),
		payments: many(paymentsTable),
		storageUsage: one(storageUsageCacheTable),
	}),
);

export const membersTableRelations = relations(membersTable, ({ one }) => ({
	organization: one(organizationsTable, {
		fields: [membersTable.organizationId],
		references: [organizationsTable.id],
	}),
	user: one(usersTable, {
		fields: [membersTable.userId],
		references: [usersTable.id],
	}),
}));

export const teamsRelations = relations(teamsTable, ({ one, many }) => ({
	organization: one(organizationsTable, {
		fields: [teamsTable.orgId],
		references: [organizationsTable.id],
	}),
	statuses: many(statusesTable),
	matters: many(mattersTable),
	memberships: many(teamMembershipsTable),
}));

export const teamMembershipsRelations = relations(
	teamMembershipsTable,
	({ one }) => ({
		team: one(teamsTable, {
			fields: [teamMembershipsTable.teamId],
			references: [teamsTable.id],
		}),
		user: one(usersTable, {
			fields: [teamMembershipsTable.userId],
			references: [usersTable.id],
		}),
		organization: one(organizationsTable, {
			fields: [teamMembershipsTable.orgId],
			references: [organizationsTable.id],
		}),
	}),
);

export const mattersRelations = relations(mattersTable, ({ one, many }) => ({
	team: one(teamsTable, {
		fields: [mattersTable.teamId],
		references: [teamsTable.id],
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
	approver: one(usersTable, {
		fields: [mattersTable.approvedBy],
		references: [usersTable.id],
		relationName: "approvedMatters",
	}),
	labels: many(matterLabelsTable),
	timelines: many(timelinesTable),
	attachments: many(attachmentsTable),
	views: many(matterViewsTable),
	subscriptions: many(matterSubscriptionsTable),
	watchers: many(matterWatchersTable),
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

// Billing Relations
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

// App Utils Relations
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
	organization: one(organizationsTable, {
		fields: [attachmentsTable.orgId],
		references: [organizationsTable.id],
	}),
	matter: one(mattersTable, {
		fields: [attachmentsTable.matterId],
		references: [mattersTable.id],
	}),
	uploader: one(usersTable, {
		fields: [attachmentsTable.uploaderId],
		references: [usersTable.id],
	}),
}));

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
