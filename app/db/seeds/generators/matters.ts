import { faker } from "@faker-js/faker";
import { eq, max } from "drizzle-orm";
import { v7 as uuid } from "uuid";
import { Priority } from "~/config/matter";
import { db } from "~/db";
import { matterType, timelineEventType } from "~/db/helpers";
import { matterLabelsTable, mattersTable } from "~/db/schema/matters";
import { teamsTable } from "~/db/schema/teams";
import { timelinesTable } from "~/db/schema/timelines";
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

const demoMatters = [
	{
		title: "AC Unit Repair - Main Office",
		type: "request",
		priority: Priority.HIGH,
		statusIndex: 6,
		assigneeIndex: 0,
		authorIndex: 1,
	},
	{
		title: "Fix leaking pipe in Hall B",
		type: "request",
		priority: Priority.MEDIUM,
		statusIndex: 7,
		assigneeIndex: 2,
		authorIndex: 0,
	},
	{
		title: "Stationery supplies for Accounts",
		type: "request",
		priority: Priority.LOW,
		statusIndex: 8,
		assigneeIndex: 3,
		authorIndex: 2,
	},
	{
		title: "Monthly financial reports",
		type: "task",
		priority: Priority.HIGH,
		statusIndex: 5,
		assigneeIndex: 4,
		authorIndex: 3,
	},
	{
		title: "New chairs for conference room",
		type: "request",
		priority: Priority.MEDIUM,
		statusIndex: 6,
		assigneeIndex: 5,
		authorIndex: 4,
	},
	{
		title: "Transport for field visit tomorrow",
		type: "request",
		priority: Priority.HIGH,
		statusIndex: 2,
		assigneeIndex: 6,
		authorIndex: 5,
	},
];

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

	// Status structure: first 6 are task statuses, last 3 are request statuses
	const taskStatuses = team.statusIds.slice(0, 6);
	const requestStatuses = team.statusIds.slice(6);

	const mattersBatch: Matter[] = [];
	const matterLabelsBatch: MatterLabel[] = [];
	const timelinesBatch: Timeline[] = [];

	console.log(`    Creating ${count} matters for team ${team.code}...`);

	// Create demo matters first (for first 6 matters if available)
	const demoCount = Math.min(6, count, demoMatters.length);
	for (let i = 0; i < demoCount; i++) {
		const demo = demoMatters[i];
		const isRequest = demo.type === matterType.request;

		// Map status index to actual status ID
		let selectedStatusId: string;
		if (isRequest) {
			// For requests, use request statuses (indices 6-8 map to 0-2 in requestStatuses)
			const reqIndex = Math.min(
				demo.statusIndex - 6,
				requestStatuses.length - 1,
			);
			selectedStatusId =
				requestStatuses[Math.max(0, reqIndex)] ?? requestStatuses[0];
		} else {
			// For tasks, use task statuses
			selectedStatusId =
				taskStatuses[Math.min(demo.statusIndex, taskStatuses.length - 1)] ??
				taskStatuses[0];
		}

		const author = team.memberIds[demo.authorIndex % team.memberIds.length];
		const assignee = team.memberIds[demo.assigneeIndex % team.memberIds.length];

		const createdAt = randomDate(oneYearAgo, now);

		// Approval logic for requests
		let approvedBy = null,
			approvedAt = null,
			rejectionReason = null;
		if (isRequest && demo.statusIndex === 8) {
			// Approved status
			approvedBy = team.memberIds[0]; // Owner approves
			approvedAt = randomDate(createdAt, now);
		}

		const matterId = uuid();
		const description = `Sample ${demo.type}: ${demo.title}. Created for demonstration purposes.`;

		mattersBatch.push({
			id: matterId,
			shortID: currentShortId++,
			orgId: team.orgId,
			teamId: team.id,
			teamCode: team.code,
			authorId: author,
			assigneeId: assignee,
			statusId: selectedStatusId,
			title: demo.title,
			description,
			type: demo.type,
			priority: demo.priority,
			source: "seed",
			approvedBy,
			approvedAt,
			rejectionReason,
			dueDate:
				Math.random() < 0.7
					? randomDate(
							createdAt,
							new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
						)
					: null,
			startDate: Math.random() < 0.5 ? randomDate(createdAt, now) : null,
			completedAt: demo.statusIndex === 5 ? randomDate(createdAt, now) : null,
			estimatedHours:
				Math.random() < 0.6 ? Math.floor(Math.random() * 20) + 1 : null,
			actualHours: null,
			archived: false,
			archivedAt: null,
			archivedBy: null,
			createdAt,
			updatedAt: randomDate(createdAt, now),
			deletedAt: null,
		});

		// Add timeline event
		timelinesBatch.push({
			id: uuid(),
			matterId,
			userId: author,
			type: timelineEventType.created,
			content: `Created this ${demo.type}`,
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

	// Create remaining matters randomly
	for (let i = demoCount; i < count; i++) {
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

		// Approval logic for requests
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

		const matterId = uuid();
		const description = faker.lorem.paragraph();

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
			completedAt: null,
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
			id: uuid(),
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
