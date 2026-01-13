import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

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
		.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
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

export const usersTableRelations = relations(usersTable, ({ many }) => ({
	sessionsTables: many(sessionsTable),
	accountsTables: many(accountsTable),
	membersTables: many(membersTable),
	invitationsTables: many(invitationsTable),
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
