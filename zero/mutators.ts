import { createId } from "@paralleldrive/cuid2";
import type { CustomMutatorDefs } from "@rocicorp/zero";
import { matterType, membershipStatus, workspaceRole } from "~/db/helpers";
import { canCreateRequests, canCreateTasks } from "~/lib/permissions";
import { reservedWorkspaceSlugs } from "~/lib/validations/organization";
import {
	DEFAULT_LABELS,
	DEFAULT_STATUSES,
} from "../app/lib/server/default-workspace-data";
import { allocateShortID, type MutatorTx } from "./mutator-helpers";

/**
 * Auth context passed to mutators. Follows zbugs pattern: minimal auth data.
 */
type AuthData = {
	sub: string;
	activeOrganizationId: string | null;
};

export type Mutators = ReturnType<typeof createMutators>;

/**
 * Create custom mutators with authentication context.
 * Following zbugs pattern: inline permission checks, minimal helpers.
 */
export function createMutators(authData: AuthData) {
	const userId = authData.sub;
	const orgId = authData.activeOrganizationId;

	// --------------------------------------------------------------------------
	// Helper: Assert user is logged in
	// --------------------------------------------------------------------------
	function assertLoggedIn() {
		if (!orgId) {
			throw new Error("User must be logged in");
		}
	}

	// --------------------------------------------------------------------------
	// Helper: Get workspace membership
	// --------------------------------------------------------------------------
	async function getWorkspaceMembership(tx: MutatorTx, workspaceId: string) {
		assertLoggedIn();
		return await tx.query.workspaceMembershipsTable
			.where("workspaceId", workspaceId)
			.where("userId", userId)
			.where("orgId", orgId ?? "")
			.where("deletedAt", "IS", null)
			.one()
			.run();
	}

	// --------------------------------------------------------------------------
	// Helper: Assert manager role
	// --------------------------------------------------------------------------
	async function assertManager(tx: MutatorTx, workspaceId: string) {
		const membership = await getWorkspaceMembership(tx, workspaceId);
		if (!membership || membership.role !== "manager") {
			throw new Error("Only workspace managers can perform this action");
		}
	}

	// --------------------------------------------------------------------------
	// Helper: Check if user can modify matter (author, assignee, or manager)
	// --------------------------------------------------------------------------
	async function canModifyMatter(tx: MutatorTx, matterId: string) {
		assertLoggedIn();
		const matter = await tx.query.mattersTable
			.where("id", matterId)
			.where("orgId", orgId ?? "")
			.where("deletedAt", "IS", null)
			.one()
			.run();

		if (!matter) {
			throw new Error("Matter not found");
		}

		const membership = await getWorkspaceMembership(tx, matter.workspaceId);
		if (!membership) {
			throw new Error("Not a member of this workspace");
		}

		const isAuthor = matter.authorId === userId;
		const isAssignee = matter.assigneeId === userId;
		const isManager = membership.role === "manager";

		return {
			matter,
			membership,
			canModify: isAuthor || isAssignee || isManager,
		};
	}

	return {
		// ======================================================================
		// MATTER MUTATORS
		// ======================================================================

		matter: {
			create: async (
				tx: MutatorTx,
				args: {
					workspaceId: string;
					workspaceCode: string;
					title: string;
					description?: string;
					type: keyof typeof matterType; // Explicitly type args.type
					priority?: number; // 0=urgent, 1=high, 2=medium, 3=low, 4=none
					assigneeId?: string;
					dueDate?: number;
					statusId: string;
					// Optional: client-provided short ID from local cache for better offline UX
					clientShortID?: number;
				},
			) => {
				assertLoggedIn();
				const membership = await getWorkspaceMembership(tx, args.workspaceId);
				if (!membership) {
					throw new Error("Not a member of this workspace");
				}

				// Permission checks using unified permission system
				if (
					args.type === matterType.task &&
					!canCreateTasks(membership.role as "manager" | "member" | "viewer")
				) {
					throw new Error("Only managers can create tasks directly");
				}
				if (
					args.type === matterType.request &&
					!canCreateRequests(membership.role as "manager" | "member" | "viewer")
				) {
					throw new Error("You do not have permission to create requests");
				}

				const id = createId();
				const now = Date.now();

				const baseInsert = {
					id,
					workspaceId: args.workspaceId,
					workspaceCode: args.workspaceCode,
					orgId: membership.orgId,
					authorId: userId,
					statusId: args.statusId,
					title: args.title,
					type: args.type,
					assigneeId: args.assigneeId,
					description: args.description,
					priority: args.priority ?? 4, // Default to none (4)
					dueDate: args.dueDate,
					archived: false,
					approvalStatus:
						args.type === matterType.request ? "pending" : undefined,
					createdAt: now,
					updatedAt: now,
				};

				// Allocate short ID (handles both client and server logic)
				await allocateShortID(
					tx,
					args.workspaceId,
					baseInsert,
					args.clientShortID,
				);
			},

			update: async (
				tx: MutatorTx,
				args: {
					id: string;
					title?: string;
					description?: string;
					priority?: number; // 0=urgent, 1=high, 2=medium, 3=low, 4=none
					dueDate?: number | null;
				},
			) => {
				const { canModify } = await canModifyMatter(tx, args.id);
				if (!canModify) {
					throw new Error("Not allowed to update this matter");
				}

				await tx.mutate.mattersTable.update({
					...args,
					updatedAt: Date.now(),
				});
			},

			updateStatus: async (
				tx: MutatorTx,
				args: { id: string; statusId: string },
			) => {
				const { matter, membership } = await canModifyMatter(tx, args.id);

				// Permission: Only assignee or manager can change status
				if (matter.assigneeId !== userId && membership.role !== "manager") {
					throw new Error("Not allowed to change status");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					statusId: args.statusId,
					updatedAt: Date.now(),
				});
			},

			assign: async (
				tx: MutatorTx,
				args: { id: string; assigneeId: string | null },
			) => {
				const { matter, membership } = await canModifyMatter(tx, args.id);

				// Permission: Managers can assign, or users can (un)assign themselves
				const isManager = membership.role === "manager";
				const isSelfAssignment =
					args.assigneeId === userId || matter.assigneeId === userId;

				if (!isManager && !isSelfAssignment) {
					throw new Error("Only managers can change assignee");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					assigneeId: args.assigneeId,
					updatedAt: Date.now(),
				});
			},

			delete: async (tx: MutatorTx, args: { id: string }) => {
				const { canModify } = await canModifyMatter(tx, args.id);
				if (!canModify) {
					throw new Error("Not allowed to delete this matter");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					deletedAt: Date.now(),
					updatedAt: Date.now(),
				});
			},

			approve: async (tx: MutatorTx, args: { id: string; note?: string }) => {
				assertLoggedIn();
				const matter = await tx.query.mattersTable
					.where("id", args.id)
					.where("orgId", orgId ?? "")
					.where("deletedAt", "IS", null)
					.one()
					.run();

				if (!matter) {
					throw new Error("Request not found");
				}

				if (matter.type !== matterType.request) {
					throw new Error("Can only approve requests");
				}

				// Permission: Only managers can approve
				await assertManager(tx, matter.workspaceId);

				await tx.mutate.mattersTable.update({
					id: args.id,
					approvalStatus: "APPROVED",
					approvedBy: userId,
					approvedAt: Date.now(),
					rejectionReason: args.note ?? null,
					updatedAt: Date.now(),
				});
			},

			reject: async (tx: MutatorTx, args: { id: string; note?: string }) => {
				assertLoggedIn();
				const matter = await tx.query.mattersTable
					.where("id", args.id)
					.where("orgId", orgId ?? "")
					.where("deletedAt", "IS", null)
					.one()
					.run();

				if (!matter) {
					throw new Error("Request not found");
				}

				if (matter.type !== matterType.request) {
					throw new Error("Can only reject requests");
				}

				// Permission: Only managers can reject
				await assertManager(tx, matter.workspaceId);

				await tx.mutate.mattersTable.update({
					id: args.id,
					approvalStatus: "REJECTED",
					approvedBy: userId,
					approvedAt: Date.now(),
					rejectionReason: args.note ?? null,
					updatedAt: Date.now(),
				});
			},
		},

		// ======================================================================
		// TIMELINE MUTATORS
		// ======================================================================

		timeline: {
			addComment: async (
				tx: MutatorTx,
				args: { matterId: string; content: string },
			) => {
				// Permission: Ensure user can access the matter
				await canModifyMatter(tx, args.matterId);

				const id = createId();
				const now = Date.now();
				await tx.mutate.timelinesTable.insert({
					id,
					matterId: args.matterId,
					userId,
					type: "comment",
					content: args.content,
					edited: false,
					createdAt: now,
					updatedAt: now,
				});
			},
		},

		// ======================================================================
		// WORKSPACE MUTATORS
		// ======================================================================

		workspace: {
			create: async (
				tx: MutatorTx,
				args: {
					name: string;
					code: string;
					description?: string;
					icon?: string;
				},
			) => {
				assertLoggedIn();

				if (reservedWorkspaceSlugs.includes(args.code)) {
					throw new Error("This URL is reserved.");
				}

				// Verify user is org member
				const orgMembership = await tx.query.membersTable
					.where("organizationId", orgId ?? "")
					.where("userId", userId)
					.one()
					.run();

				if (!orgMembership) {
					throw new Error("Not a member of this organization");
				}

				// Find unique code by checking existing workspaces
				const existingWorkspaces = await tx.query.workspacesTable
					.where("orgId", orgMembership.organizationId)
					.run();

				const usedCodes = new Set(
					existingWorkspaces.flatMap((w) => [w.slug, w.code].filter(Boolean)),
				);

				// Generate candidates: GEN, GEN1, GEN2...
				let finalCode = args.code;
				for (let i = 0; !finalCode || usedCodes.has(finalCode); i++) {
					finalCode = i === 0 ? args.code : `${args.code}${i}`;
					if (i > 10) throw new Error("Could not generate unique code");
				}

				const workspaceId = createId();
				const now = Date.now();

				// Create workspace
				await tx.mutate.workspacesTable.insert({
					id: workspaceId,
					orgId: orgMembership.organizationId,
					name: args.name,
					slug: finalCode,
					code: finalCode,
					visibility: "private",
					nextShortId: 1,
					archived: false,
					description: args.description,
					icon: args.icon,
					createdAt: now,
					updatedAt: now,
				});

				// Prepare defaults
				const statusRows = DEFAULT_STATUSES.map((status, i) => ({
					id: createId(),
					workspaceId,
					name: status.name,
					color: status.color,
					type: status.type,
					position: i,
					isDefault: status.isDefault,
					archived: false,
					isRequestStatus: false,
					creatorId: userId,
					createdAt: now,
					updatedAt: now,
				}));

				// Insert membership + statuses in parallel
				await Promise.all([
					tx.mutate.workspaceMembershipsTable.insert({
						id: createId(),
						workspaceId,
						userId,
						orgId: orgMembership.organizationId,
						role: workspaceRole.manager,
						status: membershipStatus.active,
						canCreateTasks: true,
						canCreateRequests: true,
						canApproveRequests: true,
						canManageMembers: true,
						canManageWorkspace: true,
						createdAt: now,
						updatedAt: now,
					}),
					...statusRows.map((row) => tx.mutate.statusesTable.insert(row)),
				]);
			},

			addMember: async (
				tx: MutatorTx,
				args: {
					workspaceId: string;
					userId: string;
					role: "manager" | "member" | "viewer";
				},
			) => {
				// Permission: Only managers can add members
				await assertManager(tx, args.workspaceId);

				// Verify user is in the organization
				const orgMembership = await tx.query.membersTable
					.where("organizationId", orgId ?? "")
					.where("userId", args.userId)
					.one()
					.run();

				if (!orgMembership) {
					throw new Error("User is not a member of this organization");
				}

				// Check if already a member (including deleted)
				const existingMembership = await tx.query.workspaceMembershipsTable
					.where("workspaceId", args.workspaceId)
					.where("userId", args.userId)
					.one()
					.run();

				if (existingMembership) {
					if (existingMembership.deletedAt) {
						// Reactivate
						await tx.mutate.workspaceMembershipsTable.update({
							id: existingMembership.id,
							role: args.role,
							deletedAt: null,
							updatedAt: Date.now(),
						});
					} else {
						throw new Error("User is already a member of this workspace");
					}
				} else {
					// Create new membership
					const now = Date.now();
					await tx.mutate.workspaceMembershipsTable.insert({
						id: createId(),
						workspaceId: args.workspaceId,
						userId: args.userId,
						orgId: orgMembership.organizationId,
						role: args.role,
						status: membershipStatus.active,
						canCreateTasks: true,
						canCreateRequests: true,
						canApproveRequests: args.role === "manager",
						canManageMembers: args.role === "manager",
						canManageWorkspace: args.role === "manager",
						createdAt: now,
						updatedAt: now,
					});
				}
			},

			updateMemberRole: async (
				tx: MutatorTx,
				args: {
					workspaceId: string;
					userId: string;
					role: "manager" | "member" | "viewer";
				},
			) => {
				// Permission: Only managers can update roles
				await assertManager(tx, args.workspaceId);

				const membership = await tx.query.workspaceMembershipsTable
					.where("workspaceId", args.workspaceId)
					.where("userId", args.userId)
					.where("deletedAt", "IS", null)
					.one()
					.run();

				if (!membership) {
					throw new Error("User is not a member of this workspace");
				}

				await tx.mutate.workspaceMembershipsTable.update({
					id: membership.id,
					role: args.role,
					canApproveRequests: args.role === "manager",
					canManageMembers: args.role === "manager",
					canManageWorkspace: args.role === "manager",
					updatedAt: Date.now(),
				});
			},

			removeMember: async (
				tx: MutatorTx,
				args: {
					workspaceId: string;
					userId: string;
				},
			) => {
				// Permission: Only managers can remove members
				await assertManager(tx, args.workspaceId);

				const membership = await tx.query.workspaceMembershipsTable
					.where("workspaceId", args.workspaceId)
					.where("userId", args.userId)
					.where("deletedAt", "IS", null)
					.one()
					.run();

				if (!membership) {
					throw new Error("User is not a member of this workspace");
				}

				await tx.mutate.workspaceMembershipsTable.update({
					id: membership.id,
					deletedAt: Date.now(),
					updatedAt: Date.now(),
				});
			},
		},

		// ======================================================================
		// STATUS MUTATORS
		// ======================================================================

		status: {
			create: async (
				tx: MutatorTx,
				args: {
					workspaceId: string;
					name: string;
					type: string;
					color: string;
					position: number;
				},
			) => {
				// Permission: Only managers can create statuses
				await assertManager(tx, args.workspaceId);

				const statusId = createId();
				const now = Date.now();
				await tx.mutate.statusesTable.insert({
					id: statusId,
					workspaceId: args.workspaceId,
					name: args.name,
					type: args.type,
					position: args.position,
					isDefault: false,
					archived: false,
					isRequestStatus: false,
					// Optional field
					color: args.color,
					createdAt: now,
					updatedAt: now,
				});
			},
		},

		allocateShortIdBlock,
	} as const satisfies CustomMutatorDefs;
}

// COUNTER MUTATOR: allocate block and seed client cache (side-effect only)
export async function allocateShortIdBlock(
	tx: MutatorTx,
	args: { workspaceId: string; blockSize?: number },
): Promise<void> {
	if (!args.workspaceId) throw new Error("workspaceId required");
	if (tx.location !== "server") return;
	const size =
		typeof args.blockSize === "number" &&
		Number.isFinite(args.blockSize) &&
		args.blockSize > 0
			? Math.min(Math.floor(args.blockSize), 1000)
			: 100;
	const sql = `
	   UPDATE workspaces
	   SET next_short_id = next_short_id + $2
	   WHERE id = $1
	   RETURNING next_short_id - $2 AS start, next_short_id - 1 AS finish;
	`;
	await tx.dbTransaction.query(sql, [args.workspaceId, size]);
}

export const mutators = createMutators;
