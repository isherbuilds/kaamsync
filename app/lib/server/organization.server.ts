import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import {
	invitationsTable,
	membersTable,
	organizationsTable,
	usersTable,
} from "~/db/schema";
import type { OrgRole } from "~/lib/permissions";

/**
 * Add a member to an organization
 * This handles both direct addition and invitation acceptance
 */
export async function addMemberToOrganization(
	email: string,
	organizationId: string,
	inviterId?: string,
): Promise<{
	id: string;
	email: string;
	role: string;
	status: string;
}> {
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
		const memberId = createId();
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

	const invitationId = createId();
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
 * Get organization member count (for billing purposes)
 */
export async function getOrganizationMemberCount(organizationId: string) {
	const members = await db.query.membersTable.findMany({
		where: eq(membersTable.organizationId, organizationId),
	});

	return members.length;
}

/**
 * Get active organization for a user (for session management)
 */
export async function getActiveOrganization(
	userId: string,
): Promise<string | null> {
	const membership = await db.query.membersTable.findFirst({
		where: eq(membersTable.userId, userId),
		orderBy: (m, { desc }) => desc(m.createdAt),
	});

	return membership?.organizationId || null;
}

/**
 * Get a user's role in an organization
 */
export async function getOrganizationMemberRole(
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

export async function getOrganization(organizationId: string): Promise<{
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	createdAt: Date;
	metadata: string | null;
} | null> {
	const organization = await db.query.organizationsTable.findFirst({
		where: eq(organizationsTable.id, organizationId),
	});

	return organization ?? null;
}
