import { v7 as uuid } from "uuid";
import { db } from "~/db";
import { invitationsTable, membersTable } from "~/db/schema/auth";
import type { OrgRole } from "~/lib/auth/permissions";
import { clearUsageCache } from "~/lib/billing/service";
import {
	getOrganizationMembership,
	getOrganizationOwnerUser,
	getOrganizationById as getOrgByIdPrepared,
	getOrganizationMemberCount as getOrgMemberCountPrepared,
	getSubscriptionByCustomerId,
	getUserByEmail,
	getUserOrganizationMembership,
} from "~/lib/infra/db-prepared";

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
	const [existingUser] = await getUserByEmail.execute({ email });

	// Check if already a member
	if (existingUser) {
		const [existingMember] = await getOrganizationMembership.execute({
			userId: existingUser.id,
			organizationId,
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

		// Invalidate member count cache
		clearUsageCache(organizationId, "members");

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
		const adminMember = await getOrganizationOwnerUser.execute({
			organizationId,
			role: "owner", // Prefer owner
		});

		// Fallback to finding an admin if no owner (though owner should exist)
		if (!adminMember[0]) {
			const [admin] = await getOrganizationOwnerUser.execute({
				organizationId,
				role: "admin",
			});
			resolvedInviterId = admin?.user?.id || "system";
		} else {
			resolvedInviterId = adminMember[0].user?.id || "system";
		}
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
	const result = await getOrgMemberCountPrepared.execute({ organizationId });
	return result[0]?.count ?? 0;
}

/**
 * Get active organization for a user (for session management).
 */
export async function getActiveOrganizationId(
	userId: string,
): Promise<string | undefined> {
	const result = await getUserOrganizationMembership.execute({ userId });
	return result[0]?.organizationId;
}

/**
 * Get a user's role in an organization.
 */
export async function getMemberRole(
	organizationId: string,
	userId: string,
): Promise<OrgRole | null> {
	const result = await getOrganizationMembership.execute({
		userId,
		organizationId,
	});
	const membership = result[0];

	if (!membership) {
		return null;
	}

	if (membership.role === "owner") return "owner";
	if (membership.role === "admin") return "admin";
	return "member";
}

// =============================================================================
// ORGANIZATION QUERIES
// =============================================================================

export async function getOrganizationById(
	organizationId: string,
): Promise<OrganizationInfo | null> {
	const result = await getOrgByIdPrepared.execute({ organizationId });
	const org = result[0];
	return org ? (org as OrganizationInfo) : null;
}

// =============================================================================
// SUBSCRIPTION QUERIES
// =============================================================================

export async function findSubscriptionId(
	organizationId: string,
	customerId: string,
): Promise<string | undefined> {
	const result = await getSubscriptionByCustomerId.execute({
		organizationId,
		customerId,
	});
	return result[0]?.id;
}
