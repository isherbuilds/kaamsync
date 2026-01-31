/**
 * Prepared statements for frequently used queries.
 * Improves performance by pre-compiling SQL queries.
 */

import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import { membersTable, organizationsTable, usersTable } from "~/db/schema/auth";
import { subscriptionsTable } from "~/db/schema/billing";
import { mattersTable } from "~/db/schema/matters";
import { storageUsageCacheTable } from "~/db/schema/storage";
import { teamsTable } from "~/db/schema/teams";

// ============================================================================
// Types
// ============================================================================

export interface OrganizationUsage {
	members: number;
	teams: number;
	matters: number;
	storageGb: number;
}

// ============================================================================
// Organization & Membership Queries
// ============================================================================

export const getOrganizationMemberCount = db
	.select({ count: count() })
	.from(membersTable)
	.where(eq(membersTable.organizationId, sql.placeholder("organizationId")))
	.prepare("getOrganizationMemberCount");

export const getOrganizationTeamCount = db
	.select({ count: count() })
	.from(teamsTable)
	.where(eq(teamsTable.orgId, sql.placeholder("orgId")))
	.prepare("getOrganizationTeamCount");

export const getOrganizationStorageUsage = db
	.select({ totalBytes: storageUsageCacheTable.totalBytes })
	.from(storageUsageCacheTable)
	.where(eq(storageUsageCacheTable.orgId, sql.placeholder("orgId")))
	.prepare("getOrganizationStorageUsage");

export const getUserOrganizationMembership = db
	.select()
	.from(membersTable)
	.where(eq(membersTable.userId, sql.placeholder("userId")))
	.orderBy(desc(membersTable.createdAt))
	.limit(1)
	.prepare("getUserOrganizationMembership");

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

export const getOrganizationMatterCount = db
	.select({ count: count() })
	.from(mattersTable)
	.where(eq(mattersTable.orgId, sql.placeholder("orgId")))
	.prepare("getOrganizationMatterCount");

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
// Team Queries
// ============================================================================

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

// ============================================================================
// Matter Queries
// ============================================================================

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
// Billing Queries
// ============================================================================

export const getOrganizationSubscription = db
	.select()
	.from(subscriptionsTable)
	.where(
		eq(subscriptionsTable.organizationId, sql.placeholder("organizationId")),
	)
	.orderBy(desc(subscriptionsTable.createdAt))
	.limit(1)
	.prepare("getOrganizationSubscription");

export const getSubscriptionByCustomerId = db
	.select({ id: subscriptionsTable.id })
	.from(subscriptionsTable)
	.where(
		and(
			eq(subscriptionsTable.organizationId, sql.placeholder("organizationId")),
			eq(subscriptionsTable.billingCustomerId, sql.placeholder("customerId")),
		),
	)
	.limit(1)
	.prepare("getSubscriptionByCustomerId");

export const getOrganizationById = db
	.select({
		id: organizationsTable.id,
		name: organizationsTable.name,
		slug: organizationsTable.slug,
		logo: organizationsTable.logo,
		createdAt: organizationsTable.createdAt,
		metadata: organizationsTable.metadata,
	})
	.from(organizationsTable)
	.where(eq(organizationsTable.id, sql.placeholder("organizationId")))
	.limit(1)
	.prepare("getOrganizationById");

export const getUserByEmail = db
	.select()
	.from(usersTable)
	.where(eq(usersTable.email, sql.placeholder("email")))
	.limit(1)
	.prepare("getUserByEmail");

// ============================================================================
// Helper Functions
// ============================================================================

export async function getOrganizationUsage(
	organizationId: string,
): Promise<OrganizationUsage> {
	const [memberResult, teamResult, matterResult, storageResult] =
		await Promise.all([
			getOrganizationMemberCount.execute({ organizationId }),
			getOrganizationTeamCount.execute({ orgId: organizationId }),
			getOrganizationMatterCount.execute({ orgId: organizationId }),
			getOrganizationStorageUsage.execute({ orgId: organizationId }),
		]);

	const totalBytes = storageResult[0]?.totalBytes ?? 0;
	const storageGb = totalBytes / (1024 * 1024 * 1024);

	return {
		members: memberResult[0]?.count ?? 0,
		teams: teamResult[0]?.count ?? 0,
		matters: matterResult[0]?.count ?? 0,
		storageGb: Math.round(storageGb * 100) / 100,
	};
}

export async function getUserActiveOrganization(
	userId: string,
): Promise<string | null> {
	const membership = await getUserOrganizationMembership.execute({ userId });
	return membership[0]?.organizationId ?? null;
}
