import { createId } from "@paralleldrive/cuid2";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { membershipStatus, workspaceRole } from "~/db/helpers";
import { db } from "~/db/index";
import {
	labelsTable,
	membersTable,
	statusesTable,
	workspaceMembershipsTable,
	workspacesTable,
} from "~/db/schema";
import { DEFAULT_LABELS, DEFAULT_STATUSES } from "./default-workspace-data";

type SeedOptions = {
	orgId: string;
	workspaceName?: string; // defaults to "General"
};

function makeWorkspaceIdentifierCandidates(
	name: string,
	attempts = 10,
): string[] {
	// 1. Sanitize: remove non-alphanumeric, uppercase
	const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
	// 2. Take first 3 chars, default to "WRK" if empty
	let base = cleaned.slice(0, 3) || "WRK";
	// 3. Ensure minimum 3 chars by padding with 'X' if needed (though user example implies we just want the first 3)
	// If the user explicitly wants "minimum of 3 chars", padding is safer for very short names like "A".
	if (base.length < 3) {
		base = base.padEnd(3, "X");
	}

	const candidates: string[] = [];
	for (let i = 0; i < attempts; i++) {
		// e.g. GEN, GEN1, GEN2...
		candidates.push(i === 0 ? base : `${base}${i}`);
	}
	return candidates;
}

export async function seedWorkspaceDefaults({
	orgId,
	workspaceName = "General",
}: SeedOptions) {
	// Pre-generate all IDs upfront
	const workspaceId = createId();
	const labelIds = Array.from({ length: 5 }, () => createId());
	const statusIds = Array.from({ length: 5 }, () => createId());

	// Prepare candidates (used for BOTH slug and code)
	const candidates = makeWorkspaceIdentifierCandidates(workspaceName, 10);

	// Fetch org owner (or any member) in parallel with uniqueness probes
	const [ownerMember, existingWorkspaces] = await Promise.all([
		// Get owner first, fallback to any member using ORDER BY (single query optimization)
		db
			.select({ userId: membersTable.userId })
			.from(membersTable)
			.where(eq(membersTable.organizationId, orgId))
			.orderBy(
				// Prioritize owners (role = 'owner' comes first)
				// Using sql to create a CASE expression for conditional ordering
				sql`CASE WHEN ${membersTable.role} = 'owner' THEN 0 ELSE 1 END`,
			)
			.limit(1)
			.then((rows) => rows[0])
			.catch(() => null),
		db
			.select({ slug: workspacesTable.slug, code: workspacesTable.code })
			.from(workspacesTable)
			.where(
				and(
					eq(workspacesTable.orgId, orgId),
					or(
						inArray(workspacesTable.slug, candidates),
						inArray(workspacesTable.code, candidates),
					),
				),
			),
	]);

	// Find a candidate that is NOT used
	const usedSet = new Set<string>();
	for (const w of existingWorkspaces) {
		usedSet.add(w.slug);
		usedSet.add(w.code);
	}

	const finalSlugCode = candidates.find((c) => !usedSet.has(c));

	if (!finalSlugCode) {
		throw new Error(
			"Could not generate a unique workspace identifier (slug/code). Try a different name.",
		);
	}

	// Prepare all data structures
	const now = new Date();
	const workspaceRow = {
		id: workspaceId,
		orgId,
		name: workspaceName,
		slug: finalSlugCode,
		code: finalSlugCode,
		icon: "📁",
		description: "Default workspace",
		organizationId: orgId,
		creatorId: ownerMember?.userId ?? null,
		visibility: "private",
		nextShortId: 1,
		archived: false,
		createdAt: now,
		updatedAt: now,
	};

	const labelRows = DEFAULT_LABELS.map((label, index) => ({
		id: labelIds[index],
		orgId,
		name: label.name,
		color: label.color,
		description: label.description,
		archived: false,
		createdAt: now,
		updatedAt: now,
	}));

	const statusRows = DEFAULT_STATUSES.map((status, index) => ({
		id: statusIds[index],
		workspaceId,
		name: status.name,
		color: status.color,
		type: status.type,
		position: status.position,
		isDefault: status.isDefault,
		archived: false,
		isRequestStatus: false,
		createdAt: now,
		updatedAt: now,
	}));

	// Run labels + workspace inserts in parallel
	await Promise.all([
		db
			.insert(labelsTable)
			.values(labelRows)
			.onConflictDoNothing({ target: [labelsTable.orgId, labelsTable.name] }),
		db.insert(workspacesTable).values(workspaceRow),
	]);

	// Run all final inserts in parallel (statuses + optional membership)
	const finalInserts: Promise<any>[] = [
		db.insert(statusesTable).values(statusRows),
	];

	if (ownerMember?.userId) {
		finalInserts.push(
			db.insert(workspaceMembershipsTable).values({
				id: createId(),
				workspaceId,
				userId: ownerMember.userId,
				orgId,
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
		);
	}

	await Promise.all(finalInserts);

	return {
		workspaceId,
		labelIds,
		statusIds,
	};
}

// export default seedWorkspaceDefaults;
