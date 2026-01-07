/**
 * Optimized Zero queries that consolidate related data to reduce network requests.
 * These queries fetch multiple related entities in single requests for better performance.
 */

import { defineQueries, defineQuery } from "@rocicorp/zero";
import z from "zod";
import type { Context } from "./auth";
import { zql } from "./schema";

// ============================================================================
// QUERY HELPERS (Reused from queries.ts)
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Zero query builder types
type Q = { where: (f: string, opOrVal: unknown, v?: unknown) => any };

const withOrg = <T extends Q>(q: T, ctx: Context): T =>
	q
		.where("orgId", ctx.activeOrganizationId ?? "")
		.where("deletedAt", "IS", null);

const notDeleted = <T extends Q>(q: T): T => q.where("deletedAt", "IS", null);

// ============================================================================
// CONSOLIDATED QUERIES
// ============================================================================

export const optimizedQueries = defineQueries({
	/**
	 * Get team with all related data in single query
	 * Replaces: getTeamByCode + getTeamMembers + getTeamStatuses + getTeamLabels
	 */
	getTeamWithAllData: defineQuery(
		z.object({ teamCode: z.string() }),
		({ ctx, args: { teamCode } }) =>
			withOrg(zql.teamsTable, ctx)
				.where("code", teamCode)
				.related("memberships", q => 
					notDeleted(q)
						.related("user")
						.orderBy("role", "asc") // Managers first
						.orderBy("createdAt", "desc")
				)
				.related("statuses", q => 
					notDeleted(q).orderBy("position", "asc")
				)
				.related("matters", q =>
					notDeleted(q)
						.where("archived", false)
						.related("author")
						.related("assignee")
						.related("status")
						.orderBy("priority", "asc")
						.orderBy("updatedAt", "desc")
						.limit(100) // Recent matters only
				)
				.one()
	),

	/**
	 * Get user's dashboard data in single query
	 * Replaces: getUserAssignedMatters + getUserAuthoredMatters + getUserTeams
	 */
	getUserDashboardData: defineQuery(({ ctx }) => ({
		// Get assigned matters (tasks to work on)
		assignedMatters: withOrg(zql.mattersTable, ctx)
			.where("assigneeId", ctx.userId)
			.where("archived", false)
			.whereExists("status", s => s.where("type", "!=", "completed"))
			.related("team")
			.related("status")
			.related("author")
			.orderBy("priority", "asc")
			.orderBy("dueDate", "asc")
			.limit(50),

		// Get authored requests pending approval
		pendingRequests: withOrg(zql.mattersTable, ctx)
			.where("authorId", ctx.userId)
			.where("type", "request")
			.where("approvedBy", "IS", null)
			.where("archived", false)
			.related("team")
			.related("status")
			.related("assignee")
			.orderBy("createdAt", "desc")
			.limit(25),

		// Get user's teams with member counts
		teams: withOrg(zql.teamsTable, ctx)
			.whereExists("memberships", q =>
				q.where("userId", ctx.userId).where("deletedAt", "IS", null)
			)
			.related("memberships", q => 
				notDeleted(q)
					.where("userId", ctx.userId)
					.related("user")
			)
			.orderBy("updatedAt", "desc")
			.limit(20)
	})),

	/**
	 * Get matter with full context for detail view
	 * Replaces: getMatter + getMatterTimelines + getMatterAttachments + getMatterWatchers
	 */
	getMatterWithFullContext: defineQuery(
		z.object({ id: z.string() }),
		({ ctx, args: { id } }) =>
			withOrg(zql.mattersTable, ctx)
				.where("id", id)
				.related("author")
				.related("assignee")
				.related("status")
				.related("team", q => q.related("memberships", m => 
					notDeleted(m).related("user")
				))
				.related("organization")
				.related("labels", q => q.related("label"))
				.related("timelines", q =>
					notDeleted(q)
						.related("user")
						.orderBy("createdAt", "asc")
						.limit(100) // Reasonable limit for timeline
				)
				.related("attachments", q =>
					notDeleted(q)
						.related("uploader")
						.orderBy("createdAt", "desc")
						.limit(50)
				)
				.related("watchers", q =>
					q.related("user")
					 .related("addedByUser")
					 .orderBy("createdAt", "desc")
				)
				.one()
	),

	/**
	 * Get organization overview with key metrics
	 * Replaces: getOrganization + getOrgTeams + getOrgMembers + getOrgStats
	 */
	getOrganizationOverview: defineQuery(({ ctx }) =>
		zql.organizationsTable
			.where("id", ctx.activeOrganizationId ?? "")
			.related("teams", q =>
				notDeleted(q)
					.where("archived", false)
					.related("memberships", m => 
						notDeleted(m).related("user")
					)
					.related("matters", matter =>
						notDeleted(matter)
							.where("archived", false)
							.related("status")
					)
					.orderBy("updatedAt", "desc")
			)
			.related("membersTables", q =>
				q.related("usersTable")
				 .orderBy("createdAt", "desc")
			)
			.one()
	),

	/**
	 * Get team matters with pagination and filtering
	 * Optimized version of getTeamMatters with better related data loading
	 */
	getTeamMattersOptimized: defineQuery(
		z.object({ 
			teamId: z.string(),
			limit: z.number().default(100),
			offset: z.number().default(0),
			statusFilter: z.string().optional(),
			assigneeFilter: z.string().optional(),
		}),
		({ ctx, args: { teamId, limit, offset, statusFilter, assigneeFilter } }) => {
			let query = withOrg(zql.mattersTable, ctx)
				.where("teamId", teamId)
				.where("archived", false)
				.related("author")
				.related("assignee")
				.related("status")
				.related("labels", q => q.related("label"))
				.orderBy("priority", "asc")
				.orderBy("updatedAt", "desc")
				.limit(limit)
				.offset(offset);

			if (statusFilter) {
				query = query.where("statusId", statusFilter);
			}

			if (assigneeFilter) {
				query = query.where("assigneeId", assigneeFilter);
			}

			return query;
		}
	),
});