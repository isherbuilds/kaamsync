import { relations } from "drizzle-orm";
import * as auth from "./auth";
import * as billing from "./billing";
import * as matters from "./matters";
import * as notifications from "./notifications";
import * as storage from "./storage";
import * as teams from "./teams";
import * as timelines from "./timelines";

export * from "./auth";
export * from "./billing";
export * from "./matters";
export * from "./notifications";
export * from "./storage";
export * from "./teams";
export * from "./timelines";

export const usersTableRelations = relations(auth.usersTable, ({ many }) => ({
	sessionsTables: many(auth.sessionsTable),
	accountsTables: many(auth.accountsTable),
	membersTables: many(auth.membersTable),
	invitationsTables: many(auth.invitationsTable),

	teamMemberships: many(teams.teamMembershipsTable),
	authoredMatters: many(matters.mattersTable, {
		relationName: "authoredMatters",
	}),
	assignedMatters: many(matters.mattersTable, {
		relationName: "assignedMatters",
	}),
	approvedMatters: many(matters.mattersTable, {
		relationName: "approvedMatters",
	}),
	createdStatuses: many(teams.statusesTable),
	createdLabels: many(matters.labelsTable),
	timelines: many(timelines.timelinesTable),
	attachments: many(storage.attachmentsTable),
	matterViews: many(matters.matterViewsTable),
	matterSubscriptions: many(matters.matterSubscriptionsTable),
	watchedMatters: many(matters.matterWatchersTable, {
		relationName: "watchedByUser",
	}),
	watchersAdded: many(matters.matterWatchersTable, {
		relationName: "watchersAdded",
	}),
	pushSubscriptions: many(notifications.pushSubscriptionsTable),
}));

export const sessionsTableRelations = relations(
	auth.sessionsTable,
	({ one }) => ({
		usersTable: one(auth.usersTable, {
			fields: [auth.sessionsTable.userId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const accountsTableRelations = relations(
	auth.accountsTable,
	({ one }) => ({
		usersTable: one(auth.usersTable, {
			fields: [auth.accountsTable.userId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const organizationsTableRelations = relations(
	auth.organizationsTable,
	({ many }) => ({
		membersTables: many(auth.membersTable),
		invitationsTables: many(auth.invitationsTable),
		teams: many(teams.teamsTable),
		teamMemberships: many(teams.teamMembershipsTable),
		labels: many(matters.labelsTable),
		matters: many(matters.mattersTable),
	}),
);

export const membersTableRelations = relations(
	auth.membersTable,
	({ one }) => ({
		organizationsTable: one(auth.organizationsTable, {
			fields: [auth.membersTable.organizationId],
			references: [auth.organizationsTable.id],
		}),
		usersTable: one(auth.usersTable, {
			fields: [auth.membersTable.userId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const invitationsTableRelations = relations(
	auth.invitationsTable,
	({ one }) => ({
		organizationsTable: one(auth.organizationsTable, {
			fields: [auth.invitationsTable.organizationId],
			references: [auth.organizationsTable.id],
		}),
		usersTable: one(auth.usersTable, {
			fields: [auth.invitationsTable.inviterId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const teamsRelations = relations(teams.teamsTable, ({ one, many }) => ({
	organization: one(auth.organizationsTable, {
		fields: [teams.teamsTable.orgId],
		references: [auth.organizationsTable.id],
	}),
	statuses: many(teams.statusesTable),
	matters: many(matters.mattersTable),
	memberships: many(teams.teamMembershipsTable),
}));

export const teamMembershipsRelations = relations(
	teams.teamMembershipsTable,
	({ one }) => ({
		team: one(teams.teamsTable, {
			fields: [teams.teamMembershipsTable.teamId],
			references: [teams.teamsTable.id],
		}),
		user: one(auth.usersTable, {
			fields: [teams.teamMembershipsTable.userId],
			references: [auth.usersTable.id],
		}),
		organization: one(auth.organizationsTable, {
			fields: [teams.teamMembershipsTable.orgId],
			references: [auth.organizationsTable.id],
		}),
	}),
);

export const statusesRelations = relations(
	teams.statusesTable,
	({ one, many }) => ({
		team: one(teams.teamsTable, {
			fields: [teams.statusesTable.teamId],
			references: [teams.teamsTable.id],
		}),
		creator: one(auth.usersTable, {
			fields: [teams.statusesTable.creatorId],
			references: [auth.usersTable.id],
		}),
		matters: many(matters.mattersTable),
	}),
);

export const labelsRelations = relations(
	matters.labelsTable,
	({ one, many }) => ({
		organization: one(auth.organizationsTable, {
			fields: [matters.labelsTable.orgId],
			references: [auth.organizationsTable.id],
		}),
		creator: one(auth.usersTable, {
			fields: [matters.labelsTable.creatorId],
			references: [auth.usersTable.id],
		}),
		matterLabels: many(matters.matterLabelsTable),
	}),
);

export const mattersRelations = relations(
	matters.mattersTable,
	({ one, many }) => ({
		team: one(teams.teamsTable, {
			fields: [matters.mattersTable.teamId],
			references: [teams.teamsTable.id],
		}),
		organization: one(auth.organizationsTable, {
			fields: [matters.mattersTable.orgId],
			references: [auth.organizationsTable.id],
		}),
		author: one(auth.usersTable, {
			fields: [matters.mattersTable.authorId],
			references: [auth.usersTable.id],
			relationName: "authoredMatters",
		}),
		assignee: one(auth.usersTable, {
			fields: [matters.mattersTable.assigneeId],
			references: [auth.usersTable.id],
			relationName: "assignedMatters",
		}),
		status: one(teams.statusesTable, {
			fields: [matters.mattersTable.statusId],
			references: [teams.statusesTable.id],
		}),
		labels: many(matters.matterLabelsTable),
		timelines: many(timelines.timelinesTable),
		attachments: many(storage.attachmentsTable),
		views: many(matters.matterViewsTable),
		subscriptions: many(matters.matterSubscriptionsTable),
		watchers: many(matters.matterWatchersTable),
		approver: one(auth.usersTable, {
			fields: [matters.mattersTable.approvedBy],
			references: [auth.usersTable.id],
			relationName: "approvedMatters",
		}),
	}),
);

export const matterLabelsRelations = relations(
	matters.matterLabelsTable,
	({ one }) => ({
		matter: one(matters.mattersTable, {
			fields: [matters.matterLabelsTable.matterId],
			references: [matters.mattersTable.id],
		}),
		label: one(matters.labelsTable, {
			fields: [matters.matterLabelsTable.labelId],
			references: [matters.labelsTable.id],
		}),
	}),
);

export const timelinesRelations = relations(
	timelines.timelinesTable,
	({ one }) => ({
		matter: one(matters.mattersTable, {
			fields: [timelines.timelinesTable.matterId],
			references: [matters.mattersTable.id],
		}),
		user: one(auth.usersTable, {
			fields: [timelines.timelinesTable.userId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const attachmentsRelations = relations(
	storage.attachmentsTable,
	({ one }) => ({
		organization: one(auth.organizationsTable, {
			fields: [storage.attachmentsTable.orgId],
			references: [auth.organizationsTable.id],
		}),
		matter: one(matters.mattersTable, {
			fields: [storage.attachmentsTable.matterId],
			references: [matters.mattersTable.id],
		}),
		uploader: one(auth.usersTable, {
			fields: [storage.attachmentsTable.uploaderId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const storageUsageCacheRelations = relations(
	storage.storageUsageCacheTable,
	({ one }) => ({
		organization: one(auth.organizationsTable, {
			fields: [storage.storageUsageCacheTable.orgId],
			references: [auth.organizationsTable.id],
		}),
	}),
);

export const matterViewsTableRelations = relations(
	matters.matterViewsTable,
	({ one }) => ({
		user: one(auth.usersTable, {
			fields: [matters.matterViewsTable.userId],
			references: [auth.usersTable.id],
		}),
		matter: one(matters.mattersTable, {
			fields: [matters.matterViewsTable.matterId],
			references: [matters.mattersTable.id],
		}),
	}),
);

export const matterSubscriptionsRelations = relations(
	matters.matterSubscriptionsTable,
	({ one }) => ({
		user: one(auth.usersTable, {
			fields: [matters.matterSubscriptionsTable.userId],
			references: [auth.usersTable.id],
		}),
		matter: one(matters.mattersTable, {
			fields: [matters.matterSubscriptionsTable.matterId],
			references: [matters.mattersTable.id],
		}),
	}),
);

export const matterWatchersRelations = relations(
	matters.matterWatchersTable,
	({ one }) => ({
		matter: one(matters.mattersTable, {
			fields: [matters.matterWatchersTable.matterId],
			references: [matters.mattersTable.id],
		}),
		user: one(auth.usersTable, {
			fields: [matters.matterWatchersTable.userId],
			references: [auth.usersTable.id],
			relationName: "watchedByUser",
		}),
		addedByUser: one(auth.usersTable, {
			fields: [matters.matterWatchersTable.addedBy],
			references: [auth.usersTable.id],
			relationName: "watchersAdded",
		}),
	}),
);

export const pushSubscriptionsTableRelations = relations(
	notifications.pushSubscriptionsTable,
	({ one }) => ({
		user: one(auth.usersTable, {
			fields: [notifications.pushSubscriptionsTable.userId],
			references: [auth.usersTable.id],
		}),
	}),
);

export const subscriptionsTableRelations = relations(
	billing.subscriptionsTable,
	({ one }) => ({
		organization: one(auth.organizationsTable, {
			fields: [billing.subscriptionsTable.organizationId],
			references: [auth.organizationsTable.id],
		}),
	}),
);
