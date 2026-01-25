import { and, eq } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import {
	invitationsTable,
	membersTable,
	organizationsTable,
	subscriptionsTable,
	usersTable,
} from "~/db/schema";
import type { OrgRole } from "~/lib/auth/permissions";

// =============================================================================
// TYPES
// =============================================================================

export type AddMemberResult = {
	id: string;
	email: string;
	role: string;
	status: "active" | "pending";
};

export type OrganizationInfo = {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	createdAt: Date;
	metadata: string | null;
};

// =============================================================================
// MEMBER OPERATIONS
// =============================================================================

/**
 * Add a member to an organization.
 * If user exists, adds them directly. Otherwise creates an invitation.
 */
export async function addMemberToOrganization(
	email: string,
	organizationId: string,
	inviterId?: string,
): Promise<AddMemberResult> {
	// Check if user already exists
	const existingUser = await db.query.usersTable.findFirst({
		where: eq(usersTable.email, email),
	});

	// Check if already a member
	if (existingUser) {
		const existingMember = await db.query.membersTable.findFirst({
			where: and(
				eq(membersTable.userId, existingUser.id),
				eq(membersTable.organizationId, organizationId),
			),
		});

		if (existingMember) {
			throw new Error("User is already a member of this organization");
		}
	}

	// If user exists, add them directly as a member
	if (existingUser) {
		const memberId = uuid();
		const memberData = {
			id: memberId,
			organizationId,
			userId: existingUser.id,
			role: "member" as const,
			createdAt: new Date(),
		};

		await db.insert(membersTable).values(memberData);

		return {
			id: memberId,
			email: existingUser.email,
			role: "member",
			status: "active",
		};
	}

	// User doesn't exist - create an invitation
	// We need an inviterId, so use a system user or the first admin if not provided
	let resolvedInviterId = inviterId;
	if (!resolvedInviterId) {
		// Find an admin or owner in the organization to use as inviter
		const adminMember = await db.query.membersTable.findFirst({
			where: and(
				eq(membersTable.organizationId, organizationId),
				// Look for owner or admin role
			),
		});
		resolvedInviterId = adminMember?.userId || "system";
	}

	const invitationId = uuid();
	const invitationData = {
		id: invitationId,
		organizationId,
		email,
		role: "member" as const,
		status: "pending" as const,
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
		inviterId: resolvedInviterId,
		createdAt: new Date(),
	};

	await db.insert(invitationsTable).values(invitationData);

	return {
		id: invitationId,
		email,
		role: "member",
		status: "pending",
	};
}

/**
 * Get organization member count (for billing purposes).
 */
export async function getMemberCount(organizationId: string): Promise<number> {
	const members = await db.query.membersTable.findMany({
		where: eq(membersTable.organizationId, organizationId),
	});

	return members.length;
}

/**
 * Get active organization for a user (for session management).
 */
export async function getActiveOrganizationId(
	userId: string,
): Promise<string | undefined> {
	const membership = await db.query.membersTable.findFirst({
		where: eq(membersTable.userId, userId),
		columns: {
			id: true,
		},
		orderBy: (m, { desc }) => desc(m.createdAt),
	});

	// if (!membership) {
	// 	throw new Error("User does not belong to any organization");
	// }

	return membership?.id;
}

/**
 * Get a user's role in an organization.
 */
export async function getMemberRole(
	organizationId: string,
	userId: string,
): Promise<OrgRole | null> {
	const membership = await db.query.membersTable.findFirst({
		where: and(
			eq(membersTable.organizationId, organizationId),
			eq(membersTable.userId, userId),
		),
	});

	if (!membership) {
		return null;
	}

	// Map database role to OrgRole type
	switch (membership.role) {
		case "owner":
			return "owner";
		case "admin":
			return "admin";
		case "member":
		default:
			return "member";
	}
}

// =============================================================================
// ORGANIZATION QUERIES
// =============================================================================

export async function getOrganizationById(
	organizationId: string,
): Promise<OrganizationInfo | null> {
	const organization = await db.query.organizationsTable.findFirst({
		where: eq(organizationsTable.id, organizationId),
	});

	return organization ?? null;
}

// =============================================================================
// SUBSCRIPTION QUERIES
// =============================================================================

export async function findSubscriptionId(
	organizationId: string,
	customerId: string,
): Promise<string | undefined> {
	const existingSubscription = await db.query.subscriptionsTable.findFirst({
		where: and(
			eq(subscriptionsTable.organizationId, organizationId),
			eq(subscriptionsTable.billingCustomerId, customerId),
		),
		columns: {
			id: true,
		},
	});

	return existingSubscription?.id;
}
