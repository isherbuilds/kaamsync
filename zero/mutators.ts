import { defineMutator, defineMutators } from "@rocicorp/zero";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { matterType, membershipStatus, teamRole } from "~/db/helpers";
import { TEAM_DEFAULT_STATUSES } from "~/lib/organization/defaults";
import { RESERVED_TEAM_SLUGS } from "~/lib/organization/validations";
import { assignMatterShortId } from "./helpers/mutator";
import {
	checkMatterModifyAccess,
	clearOrganizationUsageCache,
	enforceMatterCreationPermission,
	enforceTeamCreationPermission,
	findOrganizationMembership,
	findTeamMembership,
	PERMISSION_ERRORS,
	requireAuthentication,
	requireTeamRole,
} from "./helpers/permission";
import { zql } from "./schema";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that attachment IDs exist, belong to the org, and are unlinked/draft.
 * Returns the validated attachments or throws an error.
 */
async function validateAttachmentIds(
	tx: any,
	attachmentIds: string[],
	orgId: string,
	userId: string,
): Promise<
	Array<{
		id: string;
		orgId: string;
		uploaderId: string;
		subjectId: string | null;
		subjectType: string;
	}>
> {
	if (!attachmentIds.length) return [];

	// Skip validation on client - attachments are uploaded via REST API
	// and may not be synced to Zero cache yet. Server will validate.
	if (tx.location !== "server") {
		return [];
	}

	// Query attachments by IDs
	const attachments = await tx.run(
		zql.attachmentsTable.where("id", "IN", attachmentIds),
	);

	// Check all attachments exist
	if (attachments.length !== attachmentIds.length) {
		const foundIds = new Set(attachments.map((a: { id: string }) => a.id));
		const missingIds = attachmentIds.filter((id) => !foundIds.has(id));
		throw new Error(`Attachments not found: ${missingIds.join(", ")}`);
	}

	// Validate each attachment
	for (const attachment of attachments) {
		// Check org ownership
		if (attachment.orgId !== orgId) {
			throw new Error(
				`Attachment ${attachment.id} does not belong to this organization`,
			);
		}

		// Check if attachment is unlinked (draft) or owned by current user
		const isUnlinked =
			!attachment.subjectId || attachment.subjectType === "draft";
		const isOwner = attachment.uploaderId === userId;

		if (!isUnlinked && !isOwner) {
			throw new Error(
				`Attachment ${attachment.id} is already linked to another resource and you are not the owner`,
			);
		}
	}

	return attachments;
}

// ============================================================================
// MUTATORS
// ============================================================================

export const mutators = defineMutators({
	matter: {
		create: defineMutator(
			z.object({
				teamId: z.string(),
				teamCode: z.string(),
				title: z.string(),
				description: z.string().optional(),
				type: z.enum(["task", "request"]),
				priority: z.number().optional(),
				assigneeId: z.string().optional(),
				dueDate: z.number().optional(),
				statusId: z.string(),
				attachmentIds: z.array(z.string()).optional(),
				clientShortID: z.number().optional(),
			}),
			async ({ tx, ctx, args }) => {
				const id = uuid();
				const now = Date.now();
				let orgId = ctx.activeOrganizationId ?? "";

				const baseInsert = {
					id,
					teamId: args.teamId,
					teamCode: args.teamCode,
					orgId,
					authorId: ctx.userId,
					statusId: args.statusId,
					title: args.title,
					type: args.type,
					assigneeId: args.assigneeId,
					description: args.description,
					priority: args.priority ?? 4,
					dueDate: args.dueDate,
					archived: false,
					createdAt: now,
					updatedAt: now,
				};

				// Server-only: permission checks and request status override
				if (tx.location === "server") {
					const membership = await findTeamMembership(tx, ctx, args.teamId);
					if (!membership) {
						throw new Error(PERMISSION_ERRORS.NOT_TEAM_MEMBER);
					}
					enforceMatterCreationPermission(ctx, membership.role, args.type);
					baseInsert.orgId = membership.orgId;
					// Ensure server-side orgId variable matches the validated membership
					// so subsequent validation/updates use the correct organization.
					orgId = membership.orgId;

					// Override statusId for requests
					if (args.type === matterType.request) {
						const pendingStatus = await tx.run(
							zql.statusesTable
								.where("teamId", args.teamId)
								.where("type", "pending_approval")
								.one(),
						);
						if (pendingStatus) {
							baseInsert.statusId = pendingStatus.id;
						}
					}
				}

				// Insert matter immediately (optimistic on client)
				await assignMatterShortId(
					tx,
					args.teamId,
					baseInsert,
					args.clientShortID,
				);

				// Validate and link attachments (server-only validation, parallel updates)
				if (args.attachmentIds && args.attachmentIds.length > 0) {
					await validateAttachmentIds(
						tx,
						args.attachmentIds,
						orgId,
						ctx.userId,
					);

					await Promise.all(
						args.attachmentIds.map((attachmentId) =>
							tx.mutate.attachmentsTable.update({
								id: attachmentId,
								subjectId: id,
								subjectType: "matter",
							}),
						),
					);
				}

				// Invalidate cache (server-only effect)
				if (tx.location === "server") {
					clearOrganizationUsageCache(ctx, baseInsert.orgId, "matters");
				}
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
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					...args,
					updatedAt: now,
				});

				// Server-only: permission check and timeline entry
				if (tx.location === "server") {
					const { matter, canModify } = await checkMatterModifyAccess(
						tx,
						ctx,
						args.id,
					);
					if (!canModify) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}

					if (
						args.priority !== undefined &&
						args.priority !== matter.priority
					) {
						tx.mutate.timelinesTable.insert({
							id: uuid(),
							matterId: args.id,
							userId: ctx.userId,
							type: "priority_change",
							fromValue: matter.priority?.toString() ?? "4",
							toValue: args.priority.toString(),
							edited: false,
							createdAt: now,
							updatedAt: now,
						});
					}
				}
			},
		),

		updateStatus: defineMutator(
			z.object({ id: z.string(), statusId: z.string() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					statusId: args.statusId,
					updatedAt: now,
				});

				// Server-only: permission check and timeline entry
				if (tx.location === "server") {
					const { matter, membership } = await checkMatterModifyAccess(
						tx,
						ctx,
						args.id,
					);

					if (
						matter.assigneeId !== ctx.userId &&
						membership.role !== teamRole.manager
					) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}

					tx.mutate.timelinesTable.insert({
						id: uuid(),
						matterId: args.id,
						userId: ctx.userId,
						type: "status_change",
						fromStatusId: matter.statusId,
						toStatusId: args.statusId,
						edited: false,
						createdAt: now,
						updatedAt: now,
					});
				}
			},
		),

		assign: defineMutator(
			z.object({ id: z.string(), assigneeId: z.string().nullable() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					assigneeId: args.assigneeId,
					updatedAt: now,
				});

				// Server-only: permission check and timeline entry
				if (tx.location === "server") {
					const { matter, membership } = await checkMatterModifyAccess(
						tx,
						ctx,
						args.id,
					);

					const isManager = membership.role === teamRole.manager;
					const isSelfAssignment =
						args.assigneeId === ctx.userId || matter.assigneeId === ctx.userId;

					if (!isManager && !isSelfAssignment) {
						throw new Error(PERMISSION_ERRORS.MANAGER_REQUIRED);
					}

					tx.mutate.timelinesTable.insert({
						id: uuid(),
						matterId: args.id,
						userId: ctx.userId,
						type: "assignment",
						fromAssigneeId: matter.assigneeId ?? null,
						toAssigneeId: args.assigneeId ?? null,
						edited: false,
						createdAt: now,
						updatedAt: now,
					});
				}
			},
		),

		delete: defineMutator(
			z.object({ id: z.string() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					deletedAt: now,
					updatedAt: now,
				});

				// Server-only: permission check
				if (tx.location === "server") {
					const { canModify } = await checkMatterModifyAccess(tx, ctx, args.id);
					if (!canModify) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}
				}
			},
		),

		restore: defineMutator(
			z.object({ id: z.string() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					deletedAt: null,
					updatedAt: now,
				});

				// Server-only: permission check and timeline entry
				if (tx.location === "server") {
					const { canModify } = await checkMatterModifyAccess(
						tx,
						ctx,
						args.id,
						{
							deleted: true,
						},
					);
					if (!canModify) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}

					tx.mutate.timelinesTable.insert({
						id: uuid(),
						matterId: args.id,
						userId: ctx.userId,
						type: "restore",
						edited: false,
						createdAt: now,
						updatedAt: now,
					});
				}
			},
		),

		archive: defineMutator(
			z.object({ id: z.string() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					archived: true,
					archivedAt: now,
					archivedBy: ctx.userId,
					updatedAt: now,
				});

				// Server-only: permission check and timeline entry
				if (tx.location === "server") {
					const { canModify } = await checkMatterModifyAccess(tx, ctx, args.id);
					if (!canModify) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}

					tx.mutate.timelinesTable.insert({
						id: uuid(),
						matterId: args.id,
						userId: ctx.userId,
						type: "archive",
						edited: false,
						createdAt: now,
						updatedAt: now,
					});
				}
			},
		),

		unarchive: defineMutator(
			z.object({ id: z.string() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();

				// Update immediately for optimistic UI
				await tx.mutate.mattersTable.update({
					id: args.id,
					archived: false,
					archivedAt: null,
					archivedBy: null,
					updatedAt: now,
				});

				// Server-only: permission check
				if (tx.location === "server") {
					const { canModify } = await checkMatterModifyAccess(tx, ctx, args.id);
					if (!canModify) {
						throw new Error(PERMISSION_ERRORS.CANNOT_MODIFY_MATTER);
					}
				}
			},
		),

		approve: defineMutator(
			z.object({ id: z.string(), note: z.string().optional() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();
				requireAuthentication(ctx);
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
				await requireTeamRole(tx, ctx, matter.teamId, teamRole.manager);

				// Find a default task status (not request status) to assign
				const taskStatuses = await tx.run(
					zql.statusesTable
						.where("teamId", matter.teamId)
						.where("type", "NOT IN", ["pending_approval", "rejected"]),
				);

				// Explicit validation: abort if no task statuses exist in team
				if (!taskStatuses || taskStatuses.length === 0) {
					throw new Error(
						`Cannot convert request to task: no task statuses configured in team ${matter.teamId} (action: approve request ${args.id})`,
					);
				}

				const defaultStatus =
					taskStatuses.find((s) => s.isDefault) ?? taskStatuses[0];

				await tx.mutate.mattersTable.update({
					id: args.id,
					type: matterType.task,
					approvedBy: ctx.userId,
					approvedAt: now,
					rejectionReason: args.note ?? null,
					statusId: defaultStatus.id,
					updatedAt: now,
				});

				tx.mutate.timelinesTable.insert({
					id: uuid(),
					matterId: args.id,
					userId: ctx.userId,
					type: "approval",
					content: args.note,
					fromStatusId: matter.statusId,
					toStatusId: defaultStatus.id,
					edited: false,
					createdAt: now,
					updatedAt: now,
				});
			},
		),

		reject: defineMutator(
			z.object({ id: z.string(), note: z.string().optional() }),
			async ({ tx, ctx, args }) => {
				const now = Date.now();
				requireAuthentication(ctx);
				const matter = await tx.run(
					zql.mattersTable
						.where("id", args.id)
						.where("orgId", ctx.activeOrganizationId ?? "")
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!matter || matter.type !== matterType.request) {
					throw new Error("Request not found");
				}

				// Permission: Only managers can reject
				await requireTeamRole(tx, ctx, matter.teamId, teamRole.manager);

				// Find rejected status
				const rejectedStatus = await tx.run(
					zql.statusesTable
						.where("teamId", matter.teamId)
						.where("type", "rejected")
						.one(),
				);

				await tx.mutate.mattersTable.update({
					id: args.id,
					approvedBy: ctx.userId,
					approvedAt: now,
					rejectionReason: args.note ?? null,
					statusId: rejectedStatus?.id ?? matter.statusId,
					updatedAt: now,
				});

				tx.mutate.timelinesTable.insert({
					id: uuid(),
					matterId: args.id,
					userId: ctx.userId,
					type: "rejection",
					content: args.note,
					fromStatusId: matter.statusId,
					toStatusId: rejectedStatus?.id ?? matter.statusId,
					edited: false,
					createdAt: now,
					updatedAt: now,
				});
			},
		),
	},

	timeline: {
		addComment: defineMutator(
			z.object({
				matterId: z.string(),
				content: z.string(),
				attachmentIds: z.array(z.string()).optional(),
			}),
			async ({ tx, ctx, args }) => {
				const now = Date.now();
				const id = uuid();
				const orgId = ctx.activeOrganizationId ?? "";

				// Insert comment immediately for optimistic UI
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

				// Server-only: permission check (after insert for faster optimistic UI)
				if (tx.location === "server") {
					await checkMatterModifyAccess(tx, ctx, args.matterId);
				}

				// Validate and link attachments (parallel updates)
				if (args.attachmentIds && args.attachmentIds.length > 0) {
					await validateAttachmentIds(
						tx,
						args.attachmentIds,
						orgId,
						ctx.userId,
					);

					await Promise.all(
						args.attachmentIds.map((attachmentId) =>
							tx.mutate.attachmentsTable.update({
								id: attachmentId,
								subjectId: id,
								subjectType: "comment",
							}),
						),
					);
				}
			},
		),
	},

	team: {
		create: defineMutator(
			z.object({
				name: z.string(),
				code: z.string(),
				description: z.string().optional(),
				icon: z.string().optional(),
			}),
			async ({ tx, ctx, args }) => {
				if (!ctx.activeOrganizationId) return;

				if ((RESERVED_TEAM_SLUGS as readonly string[]).includes(args.code)) {
					throw new Error("This URL is reserved.");
				}

				const orgMembership = await findOrganizationMembership(
					tx,
					ctx,
					ctx.activeOrganizationId,
				);

				// Check billing limits before creating team
				enforceTeamCreationPermission(
					ctx,
					orgMembership.role ?? teamRole.member,
				);

				// Find unique code by checking existing teams
				const existingTeams = await tx.run(
					zql.teamsTable.where("orgId", orgMembership.organizationId),
				);

				const usedCodes = new Set(
					existingTeams.flatMap((w: { slug?: string; code?: string }) =>
						[w.slug, w.code].filter(Boolean),
					),
				);

				// Generate candidates: GEN, GEN1, GEN2...
				let finalCode = args.code;
				for (let i = 0; !finalCode || usedCodes.has(finalCode); i++) {
					finalCode = i === 0 ? args.code : `${args.code}${i}`;
					if (i > 10) throw new Error("Could not generate unique code");
				}

				const teamId = uuid();
				const now = Date.now();

				// Create team
				await tx.mutate.teamsTable.insert({
					id: teamId,
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

				// Prepare defaults - note: isRequestStatus is not in Zero schema, only in Drizzle
				const statusRows = TEAM_DEFAULT_STATUSES.map(
					(status: (typeof TEAM_DEFAULT_STATUSES)[number], i: number) => ({
						id: uuid(),
						teamId,
						name: status.name,
						color: status.color,
						type: status.type,
						position: i,
						isDefault: status.isDefault,
						archived: false,
						creatorId: ctx.userId,
						createdAt: now,
						updatedAt: now,
					}),
				);

				// Insert membership + statuses in parallel
				await Promise.all([
					tx.mutate.teamMembershipsTable.insert({
						id: uuid(),
						teamId,
						userId: ctx.userId,
						orgId: orgMembership.organizationId,
						role: teamRole.manager,
						status: membershipStatus.active,
						canCreateTasks: true,
						canCreateRequests: true,
						canApproveRequests: true,
						canManageMembers: true,
						canManageTeam: true,
						createdAt: now,
						updatedAt: now,
					}),
					...statusRows.map((row: any) => tx.mutate.statusesTable.insert(row)),
				]);

				// Invalidate only team count cache after team creation
				ctx.clearUsageCache?.(orgMembership.organizationId, "teams");
			},
		),

		addMember: defineMutator(
			z.object({
				teamId: z.string(),
				userId: z.string(),
				role: z.enum(teamRole),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can add members
				await requireTeamRole(tx, ctx, args.teamId, teamRole.manager);

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
					zql.teamMembershipsTable
						.where("teamId", args.teamId)
						.where("userId", args.userId)
						.one(),
				);

				if (existingMembership) {
					if (existingMembership.deletedAt) {
						// Reactivate
						const now = Date.now();
						await tx.mutate.teamMembershipsTable.update({
							id: existingMembership.id,
							role: args.role,
							deletedAt: null,
							updatedAt: now,
						});
					} else {
						throw new Error("User is already a member of this team");
					}
				} else {
					// Create new membership
					const now = Date.now();
					await tx.mutate.teamMembershipsTable.insert({
						id: uuid(),
						teamId: args.teamId,
						userId: args.userId,
						orgId: orgMembership.organizationId,
						role: args.role,
						status: membershipStatus.active,
						canCreateTasks: true,
						canCreateRequests: true,
						canApproveRequests: args.role === teamRole.manager,
						canManageMembers: args.role === teamRole.manager,
						canManageTeam: args.role === teamRole.manager,
						createdAt: now,
						updatedAt: now,
					});
				}
			},
		),

		updateMemberRole: defineMutator(
			z.object({
				teamId: z.string(),
				userId: z.string(),
				role: z.enum(teamRole),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can update roles
				await requireTeamRole(tx, ctx, args.teamId, teamRole.manager);

				const membership = await tx.run(
					zql.teamMembershipsTable
						.where("teamId", args.teamId)
						.where("userId", args.userId)
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!membership) {
					throw new Error("User is not a member of this team");
				}

				const now = Date.now();
				await tx.mutate.teamMembershipsTable.update({
					id: membership.id,
					role: args.role,
					canApproveRequests: args.role === teamRole.manager,
					canManageMembers: args.role === teamRole.manager,
					canManageTeam: args.role === teamRole.manager,
					updatedAt: now,
				});
			},
		),

		removeMember: defineMutator(
			z.object({
				teamId: z.string(),
				userId: z.string(),
			}),
			async ({ tx, ctx, args }) => {
				// Permission: Only managers can remove members
				await requireTeamRole(tx, ctx, args.teamId, teamRole.manager);

				const membership = await tx.run(
					zql.teamMembershipsTable
						.where("teamId", args.teamId)
						.where("userId", args.userId)
						.where("deletedAt", "IS", null)
						.one(),
				);

				if (!membership) {
					throw new Error("User is not a member of this team");
				}

				const now = Date.now();
				await tx.mutate.teamMembershipsTable.update({
					id: membership.id,
					deletedAt: now,
					updatedAt: now,
				});
			},
		),
	},

	status: {
		create: defineMutator(
			z.object({
				teamId: z.string(),
				name: z.string(),
				type: z.string(),
				color: z.string(),
				position: z.number(),
			}),
			async ({ tx, ctx, args }) => {
				const statusId = uuid();
				const now = Date.now();

				// Insert immediately for optimistic UI
				await tx.mutate.statusesTable.insert({
					id: statusId,
					teamId: args.teamId,
					name: args.name,
					type: args.type,
					position: args.position,
					isDefault: false,
					archived: false,
					color: args.color,
					createdAt: now,
					updatedAt: now,
				});

				// Server-only: permission check
				if (tx.location === "server") {
					await requireTeamRole(tx, ctx, args.teamId, teamRole.manager);
				}
			},
		),
	},

	allocateShortIdBlock: defineMutator(
		z.object({ teamId: z.string(), blockSize: z.number().optional() }),
		async ({ tx, args }) => {
			if (!args.teamId) throw new Error("teamId required");
			if (tx.location !== "server") return;
			const size =
				typeof args.blockSize === "number" &&
				Number.isFinite(args.blockSize) &&
				args.blockSize > 0
					? Math.min(Math.floor(args.blockSize), 1000)
					: 100;
			const sql = `
			   UPDATE teams
			   SET next_short_id = next_short_id + $2
			   WHERE id = $1
			   RETURNING next_short_id - $2 AS start, next_short_id - 1 AS finish;
			`;
			await tx.dbTransaction.query(sql, [args.teamId, size]);
		},
	),
});

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		mutators: typeof mutators;
	}
}
