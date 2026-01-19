import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { organizationsTable, usersTable } from "./auth";

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
