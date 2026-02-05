import { defineQueries, defineQuery } from "@rocicorp/zero";
import z from "zod";
import { matterType, statusType } from "~/db/helpers";
import type { Context } from "./auth";
import { zql } from "./schema";

const DEFAULT_LIMIT = 100;
const BULK_SYNC_LIMIT = 1000; // High limit for pre-sync - Zero caches to IndexedDB
const TIMELINE_LIMIT = 50;

// ============================================================================
// HELPERS
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
type Q = { where: (f: string, opOrVal: unknown, v?: unknown) => any };

const filterByOrganization = <T extends Q>(q: T, ctx: Context): T =>
	q.where("orgId", ctx.activeOrganizationId).where("deletedAt", "IS", null);

const excludeDeleted = <T extends Q>(q: T): T =>
	q.where("deletedAt", "IS", null);

const filterByTeamWithMembershipCheck = <T extends Q>(
	q: T,
	ctx: Context,
	teamId: string,
): T =>
	q
		.where("teamId", teamId)
		.where("deletedAt", "IS", null) // Filter deleted matters
		.whereExists("team", (w: any) =>
			w
				.where("orgId", ctx.activeOrganizationId ?? "")
				// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
				.whereExists("memberships", (m: any) =>
					m.where("userId", ctx.userId).where("deletedAt", "IS", null),
				),
		);

export const queries = defineQueries({
	// TEAM QUERIES
	getTeamsList: defineQuery(({ ctx }) =>
		filterByOrganization(zql.teamsTable, ctx)
			.whereExists("memberships", (m) =>
				m.where("userId", ctx.userId).where("deletedAt", "IS", null),
			)
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getTeamByCode: defineQuery(
		z.object({ code: z.string() }),
		({ ctx, args: { code } }) =>
			filterByOrganization(zql.teamsTable, ctx)
				.where("code", code)
				.related("memberships", (q) => excludeDeleted(q).related("user"))
				.one(),
	),

	getUserTeams: defineQuery(({ ctx }) =>
		filterByOrganization(zql.teamMembershipsTable, ctx)
			.where("userId", ctx.userId)
			.related("team", (q) => excludeDeleted(q))
			.limit(DEFAULT_LIMIT),
	),

	// MATTER QUERIES
	getMatter: defineQuery(
		z.object({ id: z.string() }),
		({ ctx, args: { id } }) =>
			filterByOrganization(zql.mattersTable, ctx)
				.where("id", id)
				.related("status")
				.related("attachments")
				.related("labels", (q) => q.related("label"))
				.one(),
	),

	getMatterByKey: defineQuery(
		z.object({ code: z.string(), shortID: z.number() }),
		({ ctx, args: { code, shortID } }) =>
			filterByOrganization(zql.mattersTable, ctx)
				.where("teamCode", code)
				.where("shortID", shortID)
				.related("status")
				.related("attachments")
				.related("labels", (q) => q.related("label"))
				.one(),
	),

	getTeamMatters: defineQuery(
		z.object({ teamId: z.string() }),
		({ ctx, args: { teamId } }) =>
			filterByTeamWithMembershipCheck(zql.mattersTable, ctx, teamId)
				.where("type", matterType.task)
				.orderBy("priority", "asc")
				.orderBy("dueDate", "asc")
				.orderBy("createdAt", "desc")
				.limit(BULK_SYNC_LIMIT),
	),

	// Pre-sync all matters across ALL teams user has access to
	// This enables instant team switching (no teamId filter)
	getAllMatters: defineQuery(z.tuple([]), ({ ctx }) =>
		filterByOrganization(zql.mattersTable, ctx)
			.where("type", matterType.task)
			.whereExists("team", (w) =>
				w.whereExists("memberships", (m) =>
					m.where("userId", ctx.userId).where("deletedAt", "IS", null),
				),
			)
			.orderBy("updatedAt", "desc")
			.limit(BULK_SYNC_LIMIT),
	),

	getUserAssignedMatters: defineQuery(({ ctx }) =>
		filterByOrganization(zql.mattersTable, ctx)
			.where("assigneeId", ctx.userId)
			.where("type", matterType.task)
			.whereExists("status", (w) =>
				w.where("type", "IN", [statusType.notStarted, statusType.started]),
			)
			.related("status")
			.related("labels")
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getUserAuthoredMatters: defineQuery(({ ctx }) =>
		filterByOrganization(zql.mattersTable, ctx)
			.where("authorId", ctx.userId)
			.where("type", matterType.request)
			// Show all requests regardless of status
			.whereExists("status", (w) =>
				w.where("type", "IN", [statusType.pendingApproval]),
			)
			.related("status")
			.orderBy("createdAt", "desc")
			.limit(DEFAULT_LIMIT),
	),

	getPendingRequests: defineQuery(
		z.object({ teamId: z.string() }),
		({ ctx, args: { teamId } }) =>
			filterByTeamWithMembershipCheck(zql.mattersTable, ctx, teamId)
				.where("type", matterType.request)
				.whereExists("status", (w) =>
					w.where("type", statusType.pendingApproval),
				)
				.related("status")
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// Requests pending approval in teams the user is a member of (excludes user's own requests)
	getRequestsToApprove: defineQuery(({ ctx }) =>
		filterByOrganization(zql.mattersTable, ctx)
			.where("type", matterType.request)
			.where("authorId", "!=", ctx.userId) // Exclude own requests
			.whereExists("status", (w) => w.where("type", statusType.pendingApproval))
			.whereExists("team", (w) =>
				w.whereExists("memberships", (m) =>
					m
						.where("userId", ctx.userId)
						.where("canApproveRequests", true)
						.where("deletedAt", "IS", null),
				),
			)
			.related("status")
			.orderBy("createdAt", "asc")
			.limit(DEFAULT_LIMIT),
	),

	getWatchedMatters: defineQuery(
		z.object({ teamId: z.string().nullable() }),
		({ ctx, args: { teamId } }) => {
			let q = filterByOrganization(zql.mattersTable, ctx)
				.whereExists("watchers", (w) => w.where("userId", ctx.userId))
				.related("status")
				.related("team");
			if (teamId) q = q.where("teamId", teamId);
			return q.orderBy("updatedAt", "desc").limit(DEFAULT_LIMIT);
		},
	),

	getMatterWatchers: defineQuery(
		z.object({ matterId: z.string() }),
		({ ctx, args: { matterId } }) =>
			excludeDeleted(zql.matterWatchersTable)
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

	// TEAM MEMBERSHIP QUERIES
	getTeamMembers: defineQuery(
		z.object({ teamId: z.string() }),
		({ ctx, args: { teamId } }) =>
			filterByTeamWithMembershipCheck(zql.teamMembershipsTable, ctx, teamId)
				.related("user") // Needed for member selectors (name, avatar)
				.orderBy("createdAt", "asc")
				.limit(DEFAULT_LIMIT),
	),

	getMatterAttachments: defineQuery(
		z.object({ matterId: z.string() }),
		({ ctx, args: { matterId } }) =>
			zql.attachmentsTable
				.where("subjectType", "matter")
				.where("subjectId", matterId)
				.where("orgId", ctx.activeOrganizationId ?? "")
				.orderBy("created", "desc")
				.limit(DEFAULT_LIMIT),
	),

	getCommentAttachments: defineQuery(
		z.object({ commentId: z.string() }),
		({ ctx, args: { commentId } }) =>
			zql.attachmentsTable
				.where("subjectType", "comment")
				.where("subjectId", commentId)
				.where("orgId", ctx.activeOrganizationId ?? "")
				.orderBy("created", "desc")
				.limit(DEFAULT_LIMIT),
	),

	// LABEL & STATUS QUERIES
	getOrganizationLabels: defineQuery(({ ctx }) =>
		filterByOrganization(zql.labelsTable, ctx)
			.orderBy("name", "asc")
			.limit(DEFAULT_LIMIT),
	),

	getTeamStatuses: defineQuery(
		z.object({ teamId: z.string() }),
		({ ctx, args: { teamId } }) =>
			filterByTeamWithMembershipCheck(
				excludeDeleted(zql.statusesTable),
				ctx,
				teamId,
			)
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT),
	),

	// Pre-sync statuses from ALL teams for instant switching
	getAllTeamStatuses: defineQuery(
		({ ctx }) =>
			excludeDeleted(zql.statusesTable)
				// Filter to teams in current org that user is a member of
				// flip: true because user is member of few teams (small subset)
				.whereExists("team", (w) =>
					w
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.whereExists("memberships", (m) =>
							m.where("userId", ctx.userId).where("deletedAt", "IS", null),
						),
				)
				.related("team")
				.orderBy("position", "asc")
				.limit(DEFAULT_LIMIT * 10), // Higher limit for all teams
	),

	// TIMELINE QUERIES
	getMatterTimelines: defineQuery(
		z.object({ matterId: z.string() }),
		({ ctx, args: { matterId } }) =>
			excludeDeleted(zql.timelinesTable)
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
			.whereExists("membersTables", (q) =>
				q.where("organizationId", ctx.activeOrganizationId ?? ""),
			)
			.related("membersTables", (q) =>
				q
					.where("organizationId", ctx.activeOrganizationId ?? "")
					.related("organizationsTable"),
			)
			.limit(DEFAULT_LIMIT),
	),
});

export type QueryName = keyof typeof queries;
export { DEFAULT_LIMIT };
