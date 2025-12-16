import { defineQueries, defineQuery } from "@rocicorp/zero";
import z from "zod";
import type { Context } from "./auth";
import { zql } from "./schema";

const DEFAULT_LIMIT = 100;
const WORKSPACE_MATTERS_LIMIT = 1000; // High limit - Zero caches to IndexedDB
const TIMELINE_LIMIT = 50;
const ATTACHMENTS_LIMIT = 25;
const PAGE_SIZE = 100; // For paginated queries

/** Sort cursor for keyset pagination - use createdAt + id for stable sorting */
export type MatterSortCursor = {
	id: string;
	createdAt: number;
};

const matterCursorSchema = z.object({
	id: z.string(),
	createdAt: z.number(),
});

// ============================================================================
// HELPERS
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
type Q = { where: (f: string, opOrVal: unknown, v?: unknown) => any };

const withOrg = <T extends Q>(q: T, ctx: Context): T =>
	q
		.where("orgId", ctx.activeOrganizationId ?? "")
		.where("deletedAt", "IS", null);

const notDeleted = <T extends Q>(q: T): T => q.where("deletedAt", "IS", null);

const withWorkspaceAccess = <T>(q: T, ctx: Context, workspaceId: string): T =>
	// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
	(q as any)
		.where("workspaceId", workspaceId)
		.where("deletedAt", "IS", null) // Filter deleted matters
		.whereExists("workspace", (w: any) =>
			w
				.where("orgId", ctx.activeOrganizationId ?? "")
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				.whereExists("memberships", (m: any) =>
					m.where("userId", ctx.userId).where("deletedAt", "IS", null),
				),
		);

export const queries = defineQueries({
	// WORKSPACE QUERIES
	getWorkspacesList: defineQuery(({ ctx }) =>
		withOrg(zql.workspacesTable, ctx)
			.whereExists("memberships", (q) =>
				q.where("userId", ctx.userId).where("deletedAt", "IS", null),
			)
			.related("memberships", (q) => notDeleted(q).related("user"))
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getWorkspaceByCode: defineQuery(
		z.object({ code: z.string() }),
		({ ctx, args: { code } }) =>
			withOrg(zql.workspacesTable, ctx)
				.where("code", code)
				.related("memberships", (q) => notDeleted(q).related("user"))
				.one(),
	),

	getUserWorkspaces: defineQuery(({ ctx }) =>
		withOrg(zql.workspaceMembershipsTable, ctx)
			.where("userId", ctx.userId)
			.related("workspace", (q) => notDeleted(q))
			.related("user")
			.limit(DEFAULT_LIMIT),
	),

	// MATTER QUERIES
	getMatter: defineQuery(
		z.object({ id: z.string() }),
		({ ctx, args: { id } }) =>
			withOrg(zql.mattersTable, ctx)
				.where("id", id)
				.related("author")
				.related("assignee")
				.related("status")
				.related("workspace")
				.related("organization")
				.related("labels", (q) => q.related("label"))
				.related("timelines", (q) =>
					notDeleted(q)
						.related("user")
						.orderBy("createdAt", "asc")
						.limit(TIMELINE_LIMIT),
				)
				.related("attachments", (q) =>
					notDeleted(q).related("uploader").limit(ATTACHMENTS_LIMIT),
				)
				.one(),
	),

	getMatterByKey: defineQuery(
		z.object({ code: z.string(), shortID: z.number() }),
		({ ctx, args: { code, shortID } }) =>
			withOrg(zql.mattersTable, ctx)
				.where("workspaceCode", code)
				.where("shortID", shortID)
				.related("workspace")
				.related("author")
				.related("assignee")
				.related("status")
				.related("organization")
				.related("labels", (q) => q.related("label"))
				.related("timelines", (q) =>
					notDeleted(q)
						.related("user")
						.orderBy("createdAt", "asc")
						.limit(TIMELINE_LIMIT),
				)
				.related("attachments", (q) =>
					notDeleted(q).related("uploader").limit(ATTACHMENTS_LIMIT),
				)
				.one(),
	),

	getWorkspaceMatters: defineQuery(
		z.object({ workspaceId: z.string() }),
		({ ctx, args: { workspaceId } }) =>
			withWorkspaceAccess(zql.mattersTable, ctx, workspaceId)
				.where("type", "task")
				.related("status") // Only status is needed for grouping - fetch others on detail page
				// Server-side sorting: priority (numeric) → dueDate → createdAt
				// Note: Zero doesn't support ordering by related table columns (status.position)
				// but priority is now numeric so server sorts correctly.
				.orderBy("priority", "asc") // 0=urgent first, 4=none last
				.orderBy("dueDate", "asc") // earliest first, nulls last
				.orderBy("createdAt", "desc") // newest first for same priority+due date
				.limit(WORKSPACE_MATTERS_LIMIT),
	),

	// Pre-sync all matters across ALL workspaces user has access to
	// This enables instant workspace switching (no workspaceId filter)
	getAllMatters: defineQuery(z.tuple([]), ({ ctx }) =>
		withOrg(zql.mattersTable, ctx)
			.where("type", "task")
			// Only sync matters from workspaces user is a member of
			// flip: true because user is member of few workspaces (small subset)
			.whereExists("workspace", (w) =>
				w.whereExists("memberships", (m) =>
					m.where("userId", ctx.userId).where("deletedAt", "IS", null),
				),
			)
			.related("status")
			.related("workspace")
			.orderBy("updatedAt", "desc") // Sort by last modified for better cache relevance
			.limit(WORKSPACE_MATTERS_LIMIT),
	),

	getUserAssignedMatters: defineQuery(({ ctx }) =>
		withOrg(zql.mattersTable, ctx)
			.where("assigneeId", ctx.userId)
			.where("type", "task")
			.related("author")
			.related("assignee")
			.related("status")
			.related("labels", (q) => q.related("label"))
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getUserAuthoredMatters: defineQuery(({ ctx }) =>
		withOrg(zql.mattersTable, ctx)
			.where("authorId", ctx.userId)
			.where("type", "request")
			.related("assignee")
			.related("status")
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getPendingRequests: defineQuery(
		z.object({ workspaceId: z.string() }),
		({ ctx, args: { workspaceId } }) =>
			withWorkspaceAccess(zql.mattersTable, ctx, workspaceId)
				.where("type", "REQUEST")
				.where("approvalStatus", "PENDING")
				.related("author")
				.related("assignee")
				.related("status")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	getWatchedMatters: defineQuery(
		z.object({ workspaceId: z.string().nullable() }),
		({ ctx, args: { workspaceId } }) => {
			let q = withOrg(zql.mattersTable, ctx)
				.whereExists("watchers", (w) => w.where("userId", ctx.userId))
				.related("author")
				.related("assignee")
				.related("status")
				.related("workspace");
			if (workspaceId) q = q.where("workspaceId", workspaceId);
			return q.orderBy("updatedAt", "desc").limit(DEFAULT_LIMIT);
		},
	),

	getMatterWatchers: defineQuery(
		z.object({ matterId: z.string() }),
		({ ctx, args: { matterId } }) =>
			notDeleted(zql.matterWatchersTable)
				.where("matterId", matterId)
				.related("matter", (q) =>
					q.where("orgId", ctx.activeOrganizationId ?? ""),
				)
				.related("user")
				.related("addedByUser")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// ORGANIZATION QUERIES
	getOrganizationList: defineQuery(({ ctx }) =>
		zql.organizationsTable
			.whereExists("membersTables", (q) => q.where("userId", ctx.userId))
			// .related("membersTables", (q) => q.related("usersTable"))
			.limit(DEFAULT_LIMIT),
	),

	getOrganizationMembers: defineQuery(({ ctx }) =>
		zql.membersTable
			.where("organizationId", ctx.activeOrganizationId ?? "")
			.related("usersTable", (q) => q.orderBy("name", "asc"))
			.orderBy("createdAt", "asc")
			.limit(DEFAULT_LIMIT),
	),

	getOrganizationInvitations: defineQuery(({ ctx }) =>
		zql.invitationsTable
			.where("organizationId", ctx.activeOrganizationId ?? "")
			.where("status", "pending")
			.orderBy("expiresAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	// WORKSPACE MEMBERSHIP QUERIES
	getWorkspaceMembers: defineQuery(
		z.object({ workspaceId: z.string() }),
		({ ctx, args: { workspaceId } }) =>
			withWorkspaceAccess(zql.workspaceMembershipsTable, ctx, workspaceId)
				.related("user")
				.related("workspace")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// LABEL & STATUS QUERIES
	getOrganizationLabels: defineQuery(({ ctx }) =>
		withOrg(zql.labelsTable, ctx).orderBy("name", "asc").limit(DEFAULT_LIMIT),
	),

	getWorkspaceStatuses: defineQuery(
		z.object({ workspaceId: z.string() }),
		({ ctx, args: { workspaceId } }) =>
			withWorkspaceAccess(notDeleted(zql.statusesTable), ctx, workspaceId)
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// Pre-sync statuses from ALL workspaces for instant switching
	getAllWorkspaceStatuses: defineQuery(
		({ ctx }) =>
			notDeleted(zql.statusesTable)
				// Filter to workspaces in current org that user is a member of
				// flip: true because user is member of few workspaces (small subset)
				.whereExists("workspace", (w) =>
					w
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.whereExists("memberships", (m) =>
							m.where("userId", ctx.userId).where("deletedAt", "IS", null),
						),
				)
				.related("workspace")
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT * 10), // Higher limit for all workspaces
	),

	// TIMELINE QUERIES
	getMatterTimelines: defineQuery(
		z.object({ matterId: z.string() }),
		({ ctx, args: { matterId } }) =>
			notDeleted(zql.timelinesTable)
				.where("matterId", matterId)
				.related("user")
				.related("matter", (q) =>
					q.where("orgId", ctx.activeOrganizationId ?? ""),
				)
				.orderBy("createdAt", "asc")
				.limit(TIMELINE_LIMIT),
	),

	// USER QUERIES
	getOrganizationUsers: defineQuery(z.object({}), ({ ctx }) =>
		zql.usersTable
			.related("membersTables", (q) =>
				q
					.where("organizationId", ctx.activeOrganizationId ?? "")
					.related("organizationsTable"),
			)
			.limit(DEFAULT_LIMIT),
	),

	// =========================================================================
	// PAGINATED QUERIES (following zbugs issueListV2 pattern)
	// For large datasets (10k+ matters), use keyset pagination
	// =========================================================================

	/**
	 * Paginated workspace matters - use when workspace has 1000+ matters.
	 * Uses keyset pagination with cursor for efficient large list navigation.
	 */
	getWorkspaceMattersPaginated: defineQuery(
		z.object({
			workspaceId: z.string(), // workspaceId
			limit: z.number(), // limit (page size)
			cursor: matterCursorSchema.nullable(), // cursor (null for first page)
			direction: z.enum(["forward", "backward"]), // direction
		}),
		({ ctx, args: { workspaceId, limit, cursor, direction } }) => {
			let q = withWorkspaceAccess(zql.mattersTable, ctx, workspaceId)
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", (q) => q.related("label"));

			// Keyset pagination - more efficient than offset for large datasets
			if (cursor) {
				q = q.start(cursor);
			}

			const orderDir = direction === "forward" ? "desc" : "asc";
			return q
				.orderBy("createdAt", orderDir)
				.orderBy("id", orderDir)
				.limit(limit);
		},
	),

	/**
	 * Paginated user assigned matters - use for users with many tasks.
	 */
	getUserAssignedMattersPaginated: defineQuery(
		z.object({
			limit: z.number(), // limit
			cursor: matterCursorSchema.nullable(), // cursor
			direction: z.enum(["forward", "backward"]), // direction
		}),
		({ ctx, args: { limit, cursor, direction } }) => {
			let q = withOrg(zql.mattersTable, ctx)
				.where("assigneeId", ctx.userId)
				.where("type", "task")
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", (q) => q.related("label"));

			if (cursor) {
				q = q.start(cursor);
			}

			const orderDir = direction === "forward" ? "desc" : "asc";
			return q
				.orderBy("createdAt", orderDir)
				.orderBy("id", orderDir)
				.limit(limit);
		},
	),

	/**
	 * Paginated user authored matters - use for users with many requests.
	 */
	getUserAuthoredMattersPaginated: defineQuery(
		z.object({
			limit: z.number(), // limit
			cursor: matterCursorSchema.nullable(), // cursor
			direction: z.enum(["forward", "backward"]), // direction
		}),
		({ ctx, args: { limit, cursor, direction } }) => {
			let q = withOrg(zql.mattersTable, ctx)
				.where("authorId", ctx.userId)
				.where("type", "request")
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", (q) => q.related("label"));

			if (cursor) {
				q = q.start(cursor);
			}

			const orderDir = direction === "forward" ? "desc" : "asc";
			return q
				.orderBy("createdAt", orderDir)
				.orderBy("id", orderDir)
				.limit(limit);
		},
	),
});

export type QueryName = keyof typeof queries;
export { DEFAULT_LIMIT, PAGE_SIZE };
