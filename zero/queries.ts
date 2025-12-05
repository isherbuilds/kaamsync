import { syncedQueryWithContext } from "@rocicorp/zero";
import { z } from "zod";
import { builder } from "./schema.gen";

// ============================================================================
// AUTH CONTEXT TYPE (following zbugs pattern)
// ============================================================================

export type QueryContext = {
	sub: string;
	activeOrganizationId: string | null;
};

// ============================================================================
// LIMITS (following zbugs - high limits for local caching, pagination for huge lists)
// ============================================================================

const DEFAULT_LIMIT = 100;
const WORKSPACE_MATTERS_LIMIT = 1000; // High limit - Zero caches to IndexedDB
const TIMELINE_LIMIT = 50;
const ATTACHMENTS_LIMIT = 25;
const PAGE_SIZE = 100; // For paginated queries

// ============================================================================
// PAGINATION TYPES (following zbugs issueListV2 pattern)
// ============================================================================

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

const withOrg = <T extends Q>(q: T, ctx: QueryContext): T =>
	q
		.where("orgId", ctx.activeOrganizationId ?? "")
		.where("deletedAt", "IS", null);

const notDeleted = <T extends Q>(q: T): T => q.where("deletedAt", "IS", null);

const withWorkspaceAccess = <T>(
	q: T,
	ctx: QueryContext,
	workspaceId: string,
): T =>
	// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
	(q as any)
		.where("workspaceId", workspaceId)
		.where("deletedAt", "IS", null) // Filter deleted matters
		.whereExists("workspace", (w: any) =>
			w
				.where("orgId", ctx.activeOrganizationId ?? "")
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				.whereExists("memberships", (m: any) =>
					m.where("userId", ctx.sub).where("deletedAt", "IS", null),
				),
		);

// ============================================================================
// SYNCED QUERIES
// ============================================================================

export const queries = {
	// WORKSPACE QUERIES
	getWorkspacesList: syncedQueryWithContext(
		"getWorkspacesList",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.workspacesTable, ctx)
				.whereExists("memberships", (q) =>
					q.where("userId", ctx.sub).where("deletedAt", "IS", null),
				)
				.related("memberships", (q) => notDeleted(q).related("user"))
				.orderBy("createdAt", "desc")
				.limit(DEFAULT_LIMIT),
	),

	getWorkspaceByCode: syncedQueryWithContext(
		"getWorkspaceByCode",
		z.tuple([z.string()]),
		(ctx: QueryContext, code: string) =>
			withOrg(builder.workspacesTable, ctx)
				.where("code", code)
				.related("memberships", (q) => notDeleted(q).related("user"))
				.one(),
	),

	getUserWorkspaces: syncedQueryWithContext(
		"getUserWorkspaces",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.workspaceMembershipsTable, ctx)
				.where("userId", ctx.sub)
				.related("workspace", (q) => notDeleted(q))
				.related("user")
				.limit(DEFAULT_LIMIT),
	),

	// MATTER QUERIES
	getMatter: syncedQueryWithContext(
		"getMatter",
		z.tuple([z.string()]),
		(ctx: QueryContext, id: string) =>
			withOrg(builder.mattersTable, ctx)
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

	getMatterByKey: syncedQueryWithContext(
		"getMatterByKey",
		z.tuple([z.string(), z.number()]),
		(ctx: QueryContext, code: string, shortID: number) =>
			withOrg(builder.mattersTable, ctx)
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

	getWorkspaceMatters: syncedQueryWithContext(
		"getWorkspaceMatters",
		z.tuple([z.string()]),
		(ctx: QueryContext, workspaceId: string) =>
			withWorkspaceAccess(builder.mattersTable, ctx, workspaceId)
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
	getAllMatters: syncedQueryWithContext(
		"getAllMatters",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.mattersTable, ctx)
				.where("type", "task")
				// Only sync matters from workspaces user is a member of
				// flip: true because user is member of few workspaces (small subset)
				.whereExists("workspace", (w) =>
					w.whereExists("memberships", (m) =>
						m.where("userId", ctx.sub).where("deletedAt", "IS", null),
					),
				)
				.related("status")
				.related("workspace")
				.orderBy("updatedAt", "desc") // Sort by last modified for better cache relevance
				.limit(WORKSPACE_MATTERS_LIMIT),
	),

	getUserAssignedMatters: syncedQueryWithContext(
		"getUserAssignedMatters",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.mattersTable, ctx)
				.where("assigneeId", ctx.sub)
				.where("type", "task")
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", (q) => q.related("label"))
				.orderBy("createdAt", "desc")
				.limit(DEFAULT_LIMIT),
	),

	getUserAuthoredMatters: syncedQueryWithContext(
		"getUserAuthoredMatters",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.mattersTable, ctx)
				.where("authorId", ctx.sub)
				.where("type", "request")
				.related("assignee")
				.related("status")
				.orderBy("createdAt", "desc")
				.limit(DEFAULT_LIMIT),
	),

	getPendingRequests: syncedQueryWithContext(
		"getPendingRequests",
		z.tuple([z.string()]),
		(ctx: QueryContext, workspaceId: string) =>
			withWorkspaceAccess(builder.mattersTable, ctx, workspaceId)
				.where("type", "REQUEST")
				.where("approvalStatus", "PENDING")
				.related("author")
				.related("assignee")
				.related("status")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	getWatchedMatters: syncedQueryWithContext(
		"getWatchedMatters",
		z.tuple([z.string().nullable()]),
		(ctx: QueryContext, workspaceId: string | null) => {
			let q = withOrg(builder.mattersTable, ctx)
				.whereExists("watchers", (w) => w.where("userId", ctx.sub))
				.related("author")
				.related("assignee")
				.related("status")
				.related("workspace");
			if (workspaceId) q = q.where("workspaceId", workspaceId);
			return q.orderBy("updatedAt", "desc").limit(DEFAULT_LIMIT);
		},
	),

	getMatterWatchers: syncedQueryWithContext(
		"getMatterWatchers",
		z.tuple([z.string()]),
		(ctx: QueryContext, matterId: string) =>
			notDeleted(builder.matterWatchersTable)
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
	getOrganizationList: syncedQueryWithContext(
		"getOrganizationList",
		z.tuple([]),
		(ctx: QueryContext) =>
			builder.organizationsTable
				.whereExists("membersTables", (q) => q.where("userId", ctx.sub))
				.related("membersTables", (q) => q.related("usersTable"))
				.limit(DEFAULT_LIMIT),
	),

	getOrganizationMembers: syncedQueryWithContext(
		"getOrganizationMembers",
		z.tuple([]),
		(ctx: QueryContext) =>
			builder.membersTable
				.where("organizationId", ctx.activeOrganizationId ?? "")
				.related("usersTable", (q) => q.orderBy("name", "asc"))
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	getOrganizationInvitations: syncedQueryWithContext(
		"getOrganizationInvitations",
		z.tuple([]),
		(ctx: QueryContext) =>
			builder.invitationsTable
				.where("organizationId", ctx.activeOrganizationId ?? "")
				.where("status", "pending")
				.orderBy("expiresAt", "desc")
				.limit(DEFAULT_LIMIT),
	),

	// WORKSPACE MEMBERSHIP QUERIES
	getWorkspaceMembers: syncedQueryWithContext(
		"getWorkspaceMembers",
		z.tuple([z.string()]),
		(ctx: QueryContext, workspaceId: string) =>
			withWorkspaceAccess(builder.workspaceMembershipsTable, ctx, workspaceId)
				.related("user")
				.related("workspace")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// LABEL & STATUS QUERIES
	getOrganizationLabels: syncedQueryWithContext(
		"getOrganizationLabels",
		z.tuple([]),
		(ctx: QueryContext) =>
			withOrg(builder.labelsTable, ctx)
				.orderBy("name", "asc")
				.limit(DEFAULT_LIMIT),
	),

	getWorkspaceStatuses: syncedQueryWithContext(
		"getWorkspaceStatuses",
		z.tuple([z.string()]),
		(ctx: QueryContext, workspaceId: string) =>
			withWorkspaceAccess(notDeleted(builder.statusesTable), ctx, workspaceId)
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// Pre-sync statuses from ALL workspaces for instant switching
	getAllWorkspaceStatuses: syncedQueryWithContext(
		"getAllWorkspaceStatuses",
		z.tuple([]),
		(ctx: QueryContext) =>
			notDeleted(builder.statusesTable)
				// Filter to workspaces in current org that user is a member of
				// flip: true because user is member of few workspaces (small subset)
				.whereExists("workspace", (w) =>
					w
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.whereExists("memberships", (m) =>
							m.where("userId", ctx.sub).where("deletedAt", "IS", null),
						),
				)
				.related("workspace")
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT * 10), // Higher limit for all workspaces
	),

	// TIMELINE QUERIES
	getMatterTimelines: syncedQueryWithContext(
		"getMatterTimelines",
		z.tuple([z.string()]),
		(ctx: QueryContext, matterId: string) =>
			notDeleted(builder.timelinesTable)
				.where("matterId", matterId)
				.related("user")
				.related("matter", (q) =>
					q.where("orgId", ctx.activeOrganizationId ?? ""),
				)
				.orderBy("createdAt", "asc")
				.limit(TIMELINE_LIMIT),
	),

	// USER QUERIES
	getOrganizationUsers: syncedQueryWithContext(
		"getOrganizationUsers",
		z.tuple([]),
		(ctx: QueryContext) =>
			builder.usersTable
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
	getWorkspaceMattersPaginated: syncedQueryWithContext(
		"getWorkspaceMattersPaginated",
		z.tuple([
			z.string(), // workspaceId
			z.number(), // limit (page size)
			matterCursorSchema.nullable(), // cursor (null for first page)
			z.enum(["forward", "backward"]), // direction
		]),
		(
			ctx: QueryContext,
			workspaceId: string,
			limit: number,
			cursor: MatterSortCursor | null,
			direction: "forward" | "backward",
		) => {
			let q = withWorkspaceAccess(builder.mattersTable, ctx, workspaceId)
				.related("author")
				.related("assignee")
				.related("status");

			// Keyset pagination - more efficient than offset for large datasets
			if (cursor) {
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				q = (q as any).start(cursor);
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
	getUserAssignedMattersPaginated: syncedQueryWithContext(
		"getUserAssignedMattersPaginated",
		z.tuple([
			z.number(), // limit
			matterCursorSchema.nullable(), // cursor
			z.enum(["forward", "backward"]), // direction
		]),
		(
			ctx: QueryContext,
			limit: number,
			cursor: MatterSortCursor | null,
			direction: "forward" | "backward",
		) => {
			let q = withOrg(builder.mattersTable, ctx)
				.where("assigneeId", ctx.sub)
				.where("type", "task")
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", (q) => q.related("label"));

			if (cursor) {
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				q = (q as any).start(cursor);
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
	getUserAuthoredMattersPaginated: syncedQueryWithContext(
		"getUserAuthoredMattersPaginated",
		z.tuple([
			z.number(), // limit
			matterCursorSchema.nullable(), // cursor
			z.enum(["forward", "backward"]), // direction
		]),
		(
			ctx: QueryContext,
			limit: number,
			cursor: MatterSortCursor | null,
			direction: "forward" | "backward",
		) => {
			let q = withOrg(builder.mattersTable, ctx)
				.where("authorId", ctx.sub)
				.where("type", "request")
				.related("assignee")
				.related("status");

			if (cursor) {
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				q = (q as any).start(cursor);
			}

			const orderDir = direction === "forward" ? "desc" : "asc";
			return q
				.orderBy("createdAt", orderDir)
				.orderBy("id", orderDir)
				.limit(limit);
		},
	),
};

export type QueryName = keyof typeof queries;
export { DEFAULT_LIMIT, PAGE_SIZE };
