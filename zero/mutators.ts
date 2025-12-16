import { createId } from "@paralleldrive/cuid2";
import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";
import { matterType, membershipStatus, workspaceRole } from "~/db/helpers";
import { canCreateRequests, canCreateTasks } from "~/lib/permissions";
import { reservedWorkspaceSlugs } from "~/lib/validations/organization";
import { DEFAULT_STATUSES } from "../app/lib/server/default-workspace-data";
import type { Context } from "./auth";
import { allocateShortID, type MutatorTx } from "./mutator-helpers";
import { zql } from "./schema";

function assertLoggedIn(ctx: Context) {
	if (!ctx.activeOrganizationId) {
		throw new Error("User must be logged in");
	}
}

async function getWorkspaceMembership(
	tx: MutatorTx,
	ctx: Context,
	workspaceId: string,
) {
	assertLoggedIn(ctx);
	return await tx.run(
		zql.workspaceMembershipsTable
			.where("workspaceId", workspaceId)
			.where("userId", ctx.userId)
			.where("orgId", ctx.activeOrganizationId ?? "")
			.where("deletedAt", "IS", null)
			.one(),
	);
}

async function assertManager(tx: MutatorTx, ctx: Context, workspaceId: string) {
	const membership = await getWorkspaceMembership(tx, ctx, workspaceId);
	if (!membership || membership.role !== "manager") {
		throw new Error("Only workspace managers can perform this action");
	}
}

async function canModifyMatter(tx: MutatorTx, ctx: Context, matterId: string) {
	assertLoggedIn(ctx);
	const matter = await tx.run(
		zql.mattersTable
			.where("id", matterId)
			.where("orgId", ctx.activeOrganizationId ?? "")
			.where("deletedAt", "IS", null)
			.one(),
	);

	if (!matter) {
		throw new Error("Matter not found");
	}

	const membership = await getWorkspaceMembership(tx, ctx, matter.workspaceId);
	if (!membership) {
		throw new Error("Not a member of this workspace");
	}

	const isAuthor = matter.authorId === ctx.userId;
	const isAssignee = matter.assigneeId === ctx.userId;
	const isManager = membership.role === "manager";

	return {
		matter,
		membership,
		canModify: isAuthor || isAssignee || isManager,
	};
}

// ============================================================================
// MUTATORS
// ============================================================================

export const mutators = defineMutators({
	matter: {
		create: defineMutator(
			z.object({
				workspaceId: z.string(),
				workspaceCode: z.string(),
				title: z.string(),
				description: z.string().optional(),
				type: z.enum(["task", "request"]),
				priority: z.number().optional(),
				assigneeId: z.string().optional(),
				dueDate: z.number().optional(),
				statusId: z.string(),
				clientShortID: z.number().optional(),
			}),
			async ({ tx, ctx, args }) => {
				assertLoggedIn(ctx);
				const membership = await getWorkspaceMembership(
					tx,
					ctx,
					args.workspaceId,
				);
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
					authorId: ctx.userId,
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
		),

		update: defineMutator(
			z.object({
				id: z.string(),
				title: z.string().optional(),
				description: z.string().optional(),
				priority: z.number().optional(),
				dueDate: z.number().nullable().optional(),
			}),
			async ({ tx, ctx, args }) => {
				const { canModify } = await canModifyMatter(tx, ctx, args.id);
				if (!canModify) {
					throw new Error("Not allowed to update this matter");
				}

				await tx.mutate.mattersTable.update({
					...args,
					updatedAt: Date.now(),
				});
			},
		),

		updateStatus: defineMutator(
			z.object({ id: z.string(), statusId: z.string() }),
			async ({ tx, ctx, args }) => {
				const { matter, membership } = await canModifyMatter(tx, ctx, args.id);

				// Permission: Only assignee or manager can change status
				if (matter.assigneeId !== ctx.userId && membership.role !== "manager") {
					throw new Error("Not allowed to change status");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					statusId: args.statusId,
					updatedAt: Date.now(),
				});
			},
		),

		assign: defineMutator(
			z.object({ id: z.string(), assigneeId: z.string().nullable() }),
			async ({ tx, ctx, args }) => {
				const { matter, membership } = await canModifyMatter(tx, ctx, args.id);

				// Permission: Managers can assign, or users can (un)assign themselves
				const isManager = membership.role === "manager";
				const isSelfAssignment =
					args.assigneeId === ctx.userId || matter.assigneeId === ctx.userId;

				if (!isManager && !isSelfAssignment) {
					throw new Error("Only managers can change assignee");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					assigneeId: args.assigneeId,
					updatedAt: Date.now(),
				});
			},
		),

		delete: defineMutator(
			z.object({ id: z.string() }),
			async ({ tx, ctx, args }) => {
				const { canModify } = await canModifyMatter(tx, ctx, args.id);
				if (!canModify) {
					throw new Error("Not allowed to delete this matter");
				}

				await tx.mutate.mattersTable.update({
					id: args.id,
					deletedAt: Date.now(),
					updatedAt: Date.now(),
				});
			},
		),

		approve: defineMutator(
			z.object({ id: z.string(), note: z.string().optional() }),
			async ({ tx, ctx, args }) => {
				assertLoggedIn(ctx);
				const matter = await tx.run(
					zql.mattersTable
						.where("id", args.id)
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!matter) {
					throw new Error("Request not found");
				}

				if (matter.type !== matterType.request) {
					throw new Error("Can only approve requests");
				}

				// Permission: Only managers can approve
				await assertManager(tx, ctx, matter.workspaceId);

				await tx.mutate.mattersTable.update({
					id: args.id,
					approvalStatus: "APPROVED",
					approvedBy: ctx.userId,
					approvedAt: Date.now(),
					rejectionReason: args.note ?? null,
					updatedAt: Date.now(),
				});
			},
		),

		reject: defineMutator(
			z.object({ id: z.string(), note: z.string().optional() }),
			async ({ tx, ctx, args }) => {
				assertLoggedIn(ctx);
				const matter = await tx.run(
					zql.mattersTable
						.where("id", args.id)
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!matter) {
					throw new Error("Request not found");
				}

				if (matter.type !== matterType.request) {
					throw new Error("Can only reject requests");
				}

				// Permission: Only managers can reject
				await assertManager(tx, ctx, matter.workspaceId);

				await tx.mutate.mattersTable.update({
					id: args.id,
					approvalStatus: "REJECTED",
					approvedBy: ctx.userId,
					approvedAt: Date.now(),
					rejectionReason: args.note ?? null,
					updatedAt: Date.now(),
				});
			},
		),
	},

	timeline: {
		addComment: defineMutator(
			z.object({ matterId: z.string(), content: z.string() }),
			async ({ tx, ctx, args }) => {
				// Permission: Ensure user can access the matter
				await canModifyMatter(tx, ctx, args.matterId);

				const id = createId();
				const now = Date.now();
				await tx.mutate.timelinesTable.insert({
					id,
					matterId: args.matterId,
					userId: ctx.userId,
					type: "comment",
					content: args.content,
					edited: false,
					createdAt: now,
					updatedAt: now,
				});
			},
		),
	},

	workspace: {
		create: defineMutator(
			z.object({
				name: z.string(),
				code: z.string(),
				description: z.string().optional(),
				icon: z.string().optional(),
			}),
			async ({ tx, ctx, args }) => {
				assertLoggedIn(ctx);

				if (reservedWorkspaceSlugs.includes(args.code)) {
					throw new Error("This URL is reserved.");
				}

				// Verify user is org member
				const orgMembership = await tx.run(
					zql.membersTable
						.where("organizationId", ctx.activeOrganizationId ?? "")
						.where("userId", ctx.userId)
						.one(),
				);

				if (!orgMembership) {
					throw new Error("Not a member of this organization");
				}

				// Find unique code by checking existing workspaces
				const existingWorkspaces = await tx.run(
					zql.workspacesTable.where("orgId", orgMembership.organizationId),
				);

				const usedCodes = new Set(
					existingWorkspaces.flatMap((w: { slug?: string; code?: string }) =>
						[w.slug, w.code].filter(Boolean),
					),
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
					creatorId: ctx.userId,
					createdAt: now,
					updatedAt: now,
				}));

				// Insert membership + statuses in parallel
				await Promise.all([
					tx.mutate.workspaceMembershipsTable.insert({
						id: createId(),
						workspaceId,
						userId: ctx.userId,
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
		),

		addMember: defineMutator(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
				role: z.enum(["manager", "member", "viewer"]),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can add members
				await assertManager(tx, ctx, args.workspaceId);

				// Verify user is in the organization
				const orgMembership = await tx.run(
					zql.membersTable
						.where("organizationId", ctx.activeOrganizationId ?? "")
						.where("userId", args.userId)
						.one(),
				);

				if (!orgMembership) {
					throw new Error("User is not a member of this organization");
				}

				// Check if already a member (including deleted)
				const existingMembership = await tx.run(
					zql.workspaceMembershipsTable
						.where("workspaceId", args.workspaceId)
						.where("userId", args.userId)
						.one(),
				);

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
		),

		updateMemberRole: defineMutator(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
				role: z.enum(["manager", "member", "viewer"]),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can update roles
				await assertManager(tx, ctx, args.workspaceId);

				const membership = await tx.run(
					zql.workspaceMembershipsTable
						.where("workspaceId", args.workspaceId)
						.where("userId", args.userId)
						.where("deletedAt", "IS", null)
						.one(),
				);

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
		),

		removeMember: defineMutator(
			z.object({
				workspaceId: z.string(),
				userId: z.string(),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can remove members
				await assertManager(tx, ctx, args.workspaceId);

				const membership = await tx.run(
					zql.workspaceMembershipsTable
						.where("workspaceId", args.workspaceId)
						.where("userId", args.userId)
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!membership) {
					throw new Error("User is not a member of this workspace");
				}

				await tx.mutate.workspaceMembershipsTable.update({
					id: membership.id,
					deletedAt: Date.now(),
					updatedAt: Date.now(),
				});
			},
		),
	},

	status: {
		create: defineMutator(
			z.object({
				workspaceId: z.string(),
				name: z.string(),
				type: z.string(),
				color: z.string(),
				position: z.number(),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can create statuses
				await assertManager(tx, ctx, args.workspaceId);

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
					color: args.color,
					createdAt: now,
					updatedAt: now,
				});
			},
		),
	},

	allocateShortIdBlock: defineMutator(
		z.object({ workspaceId: z.string(), blockSize: z.number().optional() }),
		async ({ tx, args }) => {
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
		},
	),
});
