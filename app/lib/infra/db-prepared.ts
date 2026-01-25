/**
 * Prepared statements for frequently used queries
 * Improves performance by pre-compiling SQL queries
 */

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import {
	mattersTable,
	membersTable,
	subscriptionsTable,
	teamsTable,
	usersTable,
} from "~/db/schema";

// ============================================================================
// ORGANIZATION & MEMBERSHIP QUERIES
// ============================================================================

/**
 * Get organization member count (prepared)
 */
export const getOrganizationMemberCount = db
	.select({ count: count() })
	.from(membersTable)
	.where(eq(membersTable.organizationId, sql.placeholder("organizationId")))
	.prepare("getOrganizationMemberCount");

/**
 * Get organization team count (prepared)
 */
export const getOrganizationTeamCount = db
	.select({ count: count() })
	.from(teamsTable)
	.where(eq(teamsTable.orgId, sql.placeholder("orgId")))
	.prepare("getOrganizationTeamCount");

/**
 * Get user's organization membership (prepared)
 */
export const getUserOrganizationMembership = db
	.select()
	.from(membersTable)
	.where(eq(membersTable.userId, sql.placeholder("userId")))
	.orderBy(desc(membersTable.createdAt))
	.limit(1)
	.prepare("getUserOrganizationMembership");

/**
 * Get organization owner user (prepared)
 * Returns the related usersTable row for the member with role 'owner'
 */
export const getOrganizationOwnerUser = db
	.select({ user: usersTable })
	.from(membersTable)
	.leftJoin(usersTable, eq(membersTable.userId, usersTable.id))
	.where(
		and(
			eq(membersTable.organizationId, sql.placeholder("organizationId")),
			eq(membersTable.role, sql.placeholder("role")),
		),
	)
	.orderBy(desc(membersTable.createdAt))
	.limit(1)
	.prepare("getOrganizationOwnerUser");

/**
 * Get organization matter count (prepared)
 */
export const getOrganizationMatterCount = db
	.select({ count: count() })
	.from(mattersTable)
	.where(eq(mattersTable.orgId, sql.placeholder("orgId")))
	.prepare("getOrganizationMatterCount");

// ============================================================================
// TEAM QUERIES
// ============================================================================

/**
 * Get team by code (prepared)
 */
export const getTeamByCode = db
	.select()
	.from(teamsTable)
	.where(
		and(
			eq(teamsTable.orgId, sql.placeholder("orgId")),
			eq(teamsTable.code, sql.placeholder("code")),
		),
	)
	.prepare("getTeamByCode");

/**
 * Get organization membership (prepared)
 */
export const getOrganizationMembership = db
	.select()
	.from(membersTable)
	.where(
		and(
			eq(membersTable.userId, sql.placeholder("userId")),
			eq(membersTable.organizationId, sql.placeholder("organizationId")),
		),
	)
	.prepare("getOrganizationMembership");

// ============================================================================
// MATTER QUERIES
// ============================================================================

/**
 * Get matter by ID (prepared)
 */
export const getMatterById = db
	.select()
	.from(mattersTable)
	.where(
		and(
			eq(mattersTable.id, sql.placeholder("matterId")),
			eq(mattersTable.orgId, sql.placeholder("orgId")),
		),
	)
	.prepare("getMatterById");

/**
 * Get team matters count (prepared)
 */
export const getTeamMattersCount = db
	.select({ count: count() })
	.from(mattersTable)
	.where(
		and(
			eq(mattersTable.teamId, sql.placeholder("teamId")),
			eq(mattersTable.orgId, sql.placeholder("orgId")),
		),
	)
	.prepare("getTeamMattersCount");

// ============================================================================
// BILLING QUERIES
// ============================================================================

/**
 * Get organization subscription (prepared)
 */
export const getOrganizationSubscription = db
	.select()
	.from(subscriptionsTable)
	.where(
		eq(subscriptionsTable.organizationId, sql.placeholder("organizationId")),
	)
	.orderBy(desc(subscriptionsTable.createdAt))
	.limit(1)
	.prepare("getOrganizationSubscription");

// ============================================================================
// HELPER FUNCTIONS USING PREPARED STATEMENTS
// ============================================================================

/**
 * Get organization usage using prepared statements (PERFORMANCE OPTIMIZED)
 */
export async function getOrganizationUsagePrepared(organizationId: string) {
	const [memberResult, teamResult, matterResult] = await Promise.all([
		getOrganizationMemberCount.execute({ organizationId }),
		getOrganizationTeamCount.execute({ orgId: organizationId }),
		getOrganizationMatterCount.execute({ orgId: organizationId }),
		// getOrganizationStorageUsage(organizationId),
	]);

	return {
		members: memberResult[0]?.count ?? 0,
		teams: teamResult[0]?.count ?? 0,
		matters: matterResult[0]?.count ?? 0,
		// storage,
	};
}

/**
 * Get user's active organization using prepared statement
 */
export async function getUserActiveOrganizationPrepared(userId: string) {
	const membership = await getUserOrganizationMembership.execute({ userId });
	return membership[0]?.organizationId ?? null;
}
