/**
 * Database seeding utilities for organization and team initialization.
 */

import { and, eq, inArray, or, sql } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { db } from "~/db";
import { membershipStatus, teamRole } from "~/db/helpers";
import { membersTable } from "~/db/schema/auth";
import { labelsTable } from "~/db/schema/matters";
import {
	statusesTable,
	teamMembershipsTable,
	teamsTable,
} from "~/db/schema/teams";
import {
	TEAM_DEFAULT_LABELS,
	TEAM_DEFAULT_STATUSES,
} from "~/lib/organization/defaults";

// ============================================================================
// Types
// ============================================================================

export interface TeamSeedOptions {
	orgId: string;
	teamName?: string;
}

export interface TeamSeedResult {
	teamId: string;
	labelIds: string[];
	statusIds: string[];
}

// ============================================================================
// Helpers
// ============================================================================

function generateTeamIdentifierCandidates(
	name: string,
	maxAttempts = 10,
): string[] {
	const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	let base = cleaned.slice(0, 3) || "WRK";

	if (base.length < 3) {
		base = base.padEnd(3, "X");
	}

	const candidates: string[] = [];
	for (let i = 0; i < maxAttempts; i++) {
		candidates.push(i === 0 ? base : `${base}${i}`);
	}
	return candidates;
}

// ============================================================================
// Seed Functions
// ============================================================================

export async function seedTeamDefaults({
	orgId,
	teamName = "General",
}: TeamSeedOptions): Promise<TeamSeedResult> {
	const teamId = uuid();
	const labelIds = Array.from({ length: TEAM_DEFAULT_LABELS.length }, () =>
		uuid(),
	);
	const statusIds = Array.from({ length: TEAM_DEFAULT_STATUSES.length }, () =>
		uuid(),
	);

	const candidates = generateTeamIdentifierCandidates(teamName, 10);

	const [ownerMember, existingTeams] = await Promise.all([
		db
			.select({ userId: membersTable.userId })
			.from(membersTable)
			.where(eq(membersTable.organizationId, orgId))
			.orderBy(sql`CASE WHEN ${membersTable.role} = 'owner' THEN 0 ELSE 1 END`)
			.limit(1)
			.then((rows) => rows[0])
			.catch(() => null),
		db
			.select({ slug: teamsTable.slug, code: teamsTable.code })
			.from(teamsTable)
			.where(
				and(
					eq(teamsTable.orgId, orgId),
					or(
						inArray(teamsTable.slug, candidates),
						inArray(teamsTable.code, candidates),
					),
				),
			),
	]);

	const usedIdentifiers = new Set<string>();
	for (const team of existingTeams) {
		usedIdentifiers.add(team.slug);
		usedIdentifiers.add(team.code);
	}

	const uniqueIdentifier = candidates.find((c) => !usedIdentifiers.has(c));

	if (!uniqueIdentifier) {
		throw new Error(
			"Could not generate a unique team identifier (slug/code). Try a different name.",
		);
	}

	const now = new Date();

	const teamRow = {
		id: teamId,
		orgId,
		name: teamName,
		slug: uniqueIdentifier,
		code: uniqueIdentifier,
		icon: "📁",
		description: "Default team",
		organizationId: orgId,
		creatorId: ownerMember?.userId ?? null,
		visibility: "private",
		nextShortId: 1,
		archived: false,
		createdAt: now,
		updatedAt: now,
	};

	const labelRows = TEAM_DEFAULT_LABELS.map((label, index) => ({
		id: labelIds[index],
		orgId,
		name: label.name,
		color: label.color,
		description: label.description,
		archived: false,
		createdAt: now,
		updatedAt: now,
	}));

	const statusRows = TEAM_DEFAULT_STATUSES.map((status, index) => ({
		id: statusIds[index],
		teamId,
		name: status.name,
		color: status.color,
		type: status.type,
		position: status.position,
		isDefault: status.isDefault,
		archived: false,
		createdAt: now,
		updatedAt: now,
	}));

	await Promise.all([
		db
			.insert(labelsTable)
			.values(labelRows)
			.onConflictDoNothing({ target: [labelsTable.orgId, labelsTable.name] }),
		db.insert(teamsTable).values(teamRow),
	]);

	const finalInserts: Promise<unknown>[] = [
		db.insert(statusesTable).values(statusRows),
	];

	if (ownerMember?.userId) {
		finalInserts.push(
			db.insert(teamMembershipsTable).values({
				id: uuid(),
				teamId,
				userId: ownerMember.userId,
				orgId,
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
		);
	}

	await Promise.all(finalInserts);

	return { teamId, labelIds, statusIds };
}
