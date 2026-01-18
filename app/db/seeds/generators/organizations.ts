import { createId } from "@paralleldrive/cuid2";
import { and, asc, eq, sql } from "drizzle-orm";
import {
	orgRole as membershipRole,
	membershipStatus,
	statusType,
	teamRole,
	teamVisibility,
} from "~/db/helpers";
import { db } from "~/db/index";
import {
	labelsTable,
	membersTable,
	organizationsTable,
	statusesTable,
	teamMembershipsTable,
	teamsTable,
	type usersTable,
} from "~/db/schema";
import type { IndustryConfig } from "../data/industries";
import { randomDate, randomPickMultiple } from "../utils";

type User = typeof usersTable.$inferSelect;

import { createUser } from "./users";

export async function createOrganization(
	config: IndustryConfig,
	sharedUsers: User[],
	usedCodes: Set<string> = new Set(), // Accept global set
) {
	const now = new Date();
	const oneYearAgo = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate(),
	);

	console.log(`🏢 Creating organization: ${config.name}...`);

	// 1. Create Organization
	const [org] = await db
		.insert(organizationsTable)
		.values({
			id: createId(),
			name: config.name,
			slug: config.slug,
			logo: null,
			createdAt: randomDate(oneYearAgo, now),
			metadata: null,
		})
		.onConflictDoUpdate({
			target: organizationsTable.slug,
			set: { name: sql`EXCLUDED.name` },
		})
		.returning();

	// 2. Create Members (with Role awareness)
	const memberRoles = config.roles;
	const orgMemberIds: string[] = [];

	const memberValues = [];

	for (let i = 0; i < memberRoles.length; i++) {
		const roleName = memberRoles[i];
		let user: User;

		// Chance to use a shared user for non-key roles logic could go here
		// For now, let's say 10% chance to be a shared user ONLY if not the first role (usually Owner/Pricipal)
		if (i > 0 && Math.random() < 0.1 && sharedUsers.length > 0) {
			user = randomPickMultiple(sharedUsers, 1)[0];
		} else {
			// Create a specific user for this role
			// Format: "First Last (Role - Industry)"
			const suffix = `${roleName} - ${config.industry}`;
			const newUser = await createUser(undefined, suffix);
			if (!newUser) continue; // Skip if failed
			user = newUser;
		}

		orgMemberIds.push(user.id);

		memberValues.push({
			id: createId(),
			organizationId: org.id,
			userId: user.id,
			role:
				i === 0
					? membershipRole.owner
					: i < 3
						? membershipRole.admin
						: membershipRole.member,
			createdAt: randomDate(oneYearAgo, now),
		});
	}

	await db.insert(membersTable).values(memberValues).onConflictDoNothing();

	// Explicitly Upsert Admin as Owner
	const adminUser = sharedUsers[0]; // Assumption based on seed.ts
	if (adminUser) {
		// Ensure Admin is in orgMemberIds for team association
		if (!orgMemberIds.includes(adminUser.id)) {
			orgMemberIds.push(adminUser.id);
		}

		// Manual Upsert: Check if exists, then update or insert
		const existingMember = await db
			.select()
			.from(membersTable)
			.where(
				and(
					eq(membersTable.organizationId, org.id),
					eq(membersTable.userId, adminUser.id),
				),
			)
			.limit(1);

		if (existingMember.length > 0) {
			console.log(`👤 Updating Admin ${adminUser.email} role in ${org.name}`);
			await db
				.update(membersTable)
				.set({ role: membershipRole.owner })
				.where(eq(membersTable.id, existingMember[0].id));
		} else {
			console.log(`👤 Inserting Admin ${adminUser.email} into ${org.name}`);
			await db.insert(membersTable).values({
				id: createId(),
				organizationId: org.id,
				userId: adminUser.id,
				role: membershipRole.owner,
				createdAt: randomDate(oneYearAgo, now),
			});
		}
	}

	// 3. Teams
	const teamData = [];

	for (const wsConfig of config.teams) {
		// Generate base code: First 3 letters of name, uppercase
		let baseCode = wsConfig.name
			.replace(/[^a-zA-Z]/g, "")
			.substring(0, 3)
			.toUpperCase();
		if (baseCode.length < 3) baseCode = wsConfig.code; // Fallback

		let code = baseCode;
		let counter = 1;

		// Simple check for duplicates within this org (using our local set)
		while (usedCodes.has(code)) {
			code = `${baseCode}${counter}`;
			counter++;
		}
		usedCodes.add(code);

		const teamId = createId();

		// Create Team (safe upsert without relying on DB unique index)
		const slug = `${config.slug}-${wsConfig.name.toLowerCase().replace(/\s+/g, "-")}`;
		const existingTeam = await db.query.teamsTable.findFirst({
			where: and(eq(teamsTable.orgId, org.id), eq(teamsTable.slug, slug)),
		});
		let team;
		if (existingTeam) {
			// Keep behavior similar to previous ON CONFLICT: update the name
			await db
				.update(teamsTable)
				.set({ name: wsConfig.name })
				.where(eq(teamsTable.id, existingTeam.id));
			team = existingTeam;
		} else {
			const [inserted] = await db
				.insert(teamsTable)
				.values({
					id: teamId,
					orgId: org.id,
					name: wsConfig.name,
					slug,
					code, // New short code
					icon: wsConfig.icon,
					description: wsConfig.description,
					visibility: teamVisibility.private,
					nextShortId: 1,
					archived: false,
					createdAt: randomDate(oneYearAgo, now),
					updatedAt: now,
				})
				.returning();
			team = inserted;
		}

		const actualTeamId = team.id;

		// 4. Labels
		const labelColors = [
			"#3b82f6",
			"#22c55e",
			"#ef4444",
			"#a855f7",
			"#10b981",
			"#f59e0b",
			"#ec4899",
		];
		const labelNames = [
			"Bug",
			"Feature",
			"Enhancement",
			"Documentation",
			"Urgent",
			"Client",
			"Internal",
		];

		const labelValues = labelNames.map((name, i) => {
			return {
				id: createId(),
				orgId: org.id,
				name: `${name}`,
				color: labelColors[i % labelColors.length],
				description: `Label for ${name}`,
				creatorId: orgMemberIds[0],
				createdAt: now,
				updatedAt: now,
			};
		});

		const insertedLabels = await db
			.insert(labelsTable)
			.values(labelValues)
			.onConflictDoUpdate({
				target: [labelsTable.orgId, labelsTable.name],
				set: { updatedAt: now },
			})
			.returning({ id: labelsTable.id, name: labelsTable.name });

		// Map names back to IDs
		const labelNameMap = Object.fromEntries(
			insertedLabels.map((l) => [l.name, l.id]),
		);
		const labelIds = labelNames
			.map((name) => labelNameMap[name])
			.filter(Boolean);

		// 5. Statuses
		// Check existing statuses
		const existingStatuses = await db
			.select()
			.from(statusesTable)
			.where(eq(statusesTable.teamId, actualTeamId))
			.orderBy(asc(statusesTable.position));
		let statusIds: string[] = [];

		if (existingStatuses.length > 0) {
			// Use existing statuses
			statusIds = existingStatuses.map((s) => s.id);
		} else {
			const statusConfigs = [
				{
					name: "Backlog",
					color: "#94a3b8",
					type: statusType.backlog,
					isDefault: false,
				},
				{
					name: "Todo",
					color: "#9ca3af",
					type: statusType.notStarted,
					isDefault: true,
				},
				{
					name: "In Progress",
					color: "#3b82f6",
					type: statusType.started,
					isDefault: false,
				},
				{
					name: "Review",
					color: "#f59e0b",
					type: statusType.started,
					isDefault: false,
				},
				{
					name: "Done",
					color: "#22c55e",
					type: statusType.completed,
					isDefault: false,
				},
				{
					name: "Canceled",
					color: "#ef4444",
					type: statusType.canceled,
					isDefault: false,
				},
			];

			const requestStatusConfigs = [
				{
					name: "Pending",
					color: "#f59e0b",
					type: statusType.pendingApproval,
					isDefault: false,
				},
				{
					name: "Approved",
					color: "#22c55e",
					type: statusType.approved,
					isDefault: false,
				},
				{
					name: "Rejected",
					color: "#ef4444",
					type: statusType.rejected,
					isDefault: false,
				},
			];

			const allStatuses = [...statusConfigs, ...requestStatusConfigs];

			const statusValues = allStatuses.map((status, i) => {
				const statusId = createId();
				statusIds.push(statusId);
				return {
					id: statusId,
					teamId: actualTeamId,
					name: status.name,
					color: status.color,
					type: status.type,
					position: i,
					isDefault: status.isDefault,
					creatorId: orgMemberIds[0],
					createdAt: now,
					updatedAt: now,
				};
			});
			await db.insert(statusesTable).values(statusValues).onConflictDoNothing();
		}

		// 6. Team Memberships
		// All org members added to all teams for simplicity in seed
		const membershipValues = [];
		const adminUser = sharedUsers[0]; // Assumption based on seed.ts

		// Add all org members to team
		for (const userId of orgMemberIds) {
			const isOrgOwner = userId === orgMemberIds[0]; // First org member is owner
			const isSharedAdmin = adminUser && userId === adminUser.id;

			let role = teamRole.member as
				| typeof teamRole.member
				| typeof teamRole.manager;
			if (isOrgOwner || isSharedAdmin) {
				role = teamRole.manager; // Ensure org owner and shared admin are managers
			}

			membershipValues.push({
				id: createId(),
				teamId: actualTeamId,
				userId,
				orgId: org.id,
				role,
				status: membershipStatus.active,
				canCreateTasks: true,
				canCreateRequests: true,
				canApproveRequests: role === teamRole.manager,
				canManageMembers: role === teamRole.manager,
				canManageTeam: role === teamRole.manager,
				createdAt: randomDate(oneYearAgo, now),
				updatedAt: now,
			});
		}

		await db
			.insert(teamMembershipsTable)
			.values(membershipValues)
			.onConflictDoNothing();

		teamData.push({
			id: actualTeamId,
			orgId: org.id,
			code,
			statusIds,
			labelIds,
			memberIds: orgMemberIds,
			wsConfig,
		});
	}

	return {
		org,
		teams: teamData,
	};
}
