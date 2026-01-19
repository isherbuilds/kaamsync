import { faker } from "@faker-js/faker";
import { createId } from "@paralleldrive/cuid2";
import { eq, max } from "drizzle-orm";
import { matterType, timelineEventType } from "~/db/helpers";
import { db } from "~/db/index";
import {
	matterLabelsTable,
	mattersTable,
	teamsTable,
	timelinesTable,
} from "~/db/schema";
import { Priority } from "~/config/matter";
import {
	batchInsert,
	randomDate,
	randomPick,
	randomPickMultiple,
} from "../utils";

type TeamData = {
	id: string;
	orgId: string;
	code: string;
	statusIds: string[];
	labelIds: string[];
	memberIds: string[];
	wsConfig: {
		taskTypes: string[];
		requestTypes: string[];
	};
};

type Matter = typeof mattersTable.$inferInsert;
type MatterLabel = typeof matterLabelsTable.$inferInsert;
type Timeline = typeof timelinesTable.$inferInsert;

export async function createMatters(team: TeamData, count: number) {
	const now = new Date();
	const oneYearAgo = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate(),
	);

	// Fetch max shortID from matters table itself to avoid conflicts if nextShortId is stale
	const [maxResult] = await db
		.select({ maxShortId: max(mattersTable.shortID) })
		.from(mattersTable)
		.where(eq(mattersTable.teamId, team.id));

	let currentShortId = (maxResult?.maxShortId ?? 0) + 1;

	// Assume first 6 are task statuses, rest request statuses (based on previous logic, but let's be robuster)
	// We don't have the status objects here, just IDs.
	// Optimization: We know from organization generator that we pushed task statuses then request statuses.
	// 6 task statuses, 3 request statuses.
	const taskStatuses = team.statusIds.slice(0, 6);
	const requestStatuses = team.statusIds.slice(6);

	const mattersBatch: Matter[] = [];
	const matterLabelsBatch: MatterLabel[] = [];
	const timelinesBatch: Timeline[] = [];

	console.log(`    Creating ${count} matters for team ${team.code}...`);

	for (let i = 0; i < count; i++) {
		const isRequestType = Math.random() < 0.3; // 30% requests, 70% tasks
		const type = isRequestType ? matterType.request : matterType.task;

		// Pick title from config
		const titleBase = isRequestType
			? randomPick(team.wsConfig.requestTypes)
			: randomPick(team.wsConfig.taskTypes);
		const title = `${titleBase} - ${faker.word.words(2)}`;

		const author = randomPick(team.memberIds);
		const assignee = Math.random() < 0.8 ? randomPick(team.memberIds) : null;

		const selectedStatusId = isRequestType
			? randomPick(requestStatuses)
			: randomPick(taskStatuses);

		// Priority distribution
		const priorityRand = Math.random();
		let priority: number;
		if (priorityRand < 0.05) priority = Priority.URGENT;
		else if (priorityRand < 0.25) priority = Priority.HIGH;
		else if (priorityRand < 0.75) priority = Priority.MEDIUM;
		else priority = Priority.LOW;

		const createdAt = randomDate(oneYearAgo, now);

		// Approval logic for requests (managed via statusId now)
		let approvedBy = null,
			approvedAt = null,
			rejectionReason = null;
		if (isRequestType) {
			const approvalRand = Math.random();
			// 50% Pending (no extra fields)
			// 35% Approved
			if (approvalRand >= 0.5 && approvalRand < 0.85) {
				approvedBy = randomPick(team.memberIds);
				approvedAt = randomDate(createdAt, now);
			}
			// 15% Rejected
			else if (approvalRand >= 0.85) {
				approvedBy = randomPick(team.memberIds);
				approvedAt = randomDate(createdAt, now);
				rejectionReason = faker.lorem.sentence();
			}
		}

		const matterId = createId();
		const description = faker.lorem.paragraph(); // Longer description

		mattersBatch.push({
			id: matterId,
			shortID: currentShortId++,
			orgId: team.orgId,
			teamId: team.id,
			teamCode: team.code,
			authorId: author,
			assigneeId: assignee,
			statusId: selectedStatusId,
			title,
			description,
			type,
			priority,
			source: "seed",
			approvedBy,
			approvedAt,
			rejectionReason,
			dueDate:
				Math.random() < 0.5
					? randomDate(
							createdAt,
							new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
						)
					: null,
			startDate: Math.random() < 0.3 ? randomDate(createdAt, now) : null,
			completedAt: null, // Simplified
			estimatedHours:
				Math.random() < 0.6 ? Math.floor(Math.random() * 40) + 1 : null,
			actualHours: null,
			archived: Math.random() < 0.05,
			archivedAt: null,
			archivedBy: null,
			createdAt,
			updatedAt: randomDate(createdAt, now),
			deletedAt: null,
		});

		// Add Labels
		if (Math.random() < 0.6) {
			const labelCount = 1 + Math.floor(Math.random() * 3);
			const selectedLabels = randomPickMultiple(team.labelIds, labelCount);
			selectedLabels.forEach((labelId) => {
				matterLabelsBatch.push({
					matterId,
					labelId,
					createdAt: now,
					updatedAt: now,
					deletedAt: null,
				});
			});
		}

		// Add Creation Timeline
		timelinesBatch.push({
			id: createId(),
			matterId,
			userId: author,
			type: timelineEventType.created,
			content: `Created this ${type}`,
			fromStatusId: null,
			toStatusId: selectedStatusId,
			fromAssigneeId: null,
			toAssigneeId: assignee,
			labelId: null,
			fromValue: null,
			toValue: null,
			mentions: null,
			edited: false,
			editedAt: null,
			createdAt,
			updatedAt: createdAt,
			deletedAt: null,
		});
	}

	await batchInsert(mattersTable, mattersBatch, 500);
	if (matterLabelsBatch.length)
		await batchInsert(matterLabelsTable, matterLabelsBatch, 500);
	if (timelinesBatch.length)
		await batchInsert(timelinesTable, timelinesBatch, 500);

	// Update nextShortId
	await db
		.update(teamsTable)
		.set({ nextShortId: currentShortId })
		.where(eq(teamsTable.id, team.id));
}
