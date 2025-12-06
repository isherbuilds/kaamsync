import "../../shared/env";
import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import {
	approvalStatus,
	matterType,
	membershipRole,
	membershipStatus,
	statusType,
	timelineEventType,
	workspaceRole,
	workspaceVisibility,
} from "~/db/helpers";
import { db } from "~/db/index";
import {
	labelsTable,
	matterLabelsTable,
	mattersTable,
	membersTable,
	organizationsTable,
	statusesTable,
	timelinesTable,
	type usersTable,
	workspaceMembershipsTable,
	workspacesTable,
} from "~/db/schema";
import { Priority } from "~/lib/matter-constants";

/**
 * Comprehensive seed file for Better Tasks database
 * Creates:
 * - Multiple users (20)
 * - Multiple organizations (3)
 * - Multiple workspaces per org (2-3)
 * - Thousands of matters (requests and tasks) across workspaces
 * - Full relationship data (memberships, labels, statuses, timelines)
 */

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
	return new Date(
		start.getTime() + Math.random() * (end.getTime() - start.getTime()),
	);
}

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to pick multiple random items
function randomPickMultiple<T>(arr: T[], count: number): T[] {
	const shuffled = [...arr].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, Math.min(count, arr.length));
}

// Sample data generators
const firstNames = [
	"Alice",
	"Bob",
	"Charlie",
	"David",
	"Emma",
	"Frank",
	"Grace",
	"Henry",
	"Iris",
	"Jack",
	"Kate",
	"Liam",
	"Maya",
	"Nathan",
	"Olivia",
	"Peter",
	"Quinn",
	"Rachel",
	"Sam",
	"Tara",
];

const lastNames = [
	"Anderson",
	"Brown",
	"Chen",
	"Davis",
	"Evans",
	"Fisher",
	"Garcia",
	"Harris",
	"Jackson",
	"Kumar",
	"Lee",
	"Martinez",
	"Nguyen",
	"O'Brien",
	"Patel",
	"Quinn",
	"Rodriguez",
	"Smith",
	"Taylor",
	"Wilson",
];

const orgNames = [
	{ name: "Acme Corp", slug: "acme-corp" },
	{ name: "TechStart Inc", slug: "techstart-inc" },
	{ name: "Global Ventures", slug: "global-ventures" },
];

const workspaceNames = [
	{ name: "Engineering", code: "ENG", icon: "🔧" },
	{ name: "Marketing", code: "MKT", icon: "📢" },
	{ name: "Finance", code: "FIN", icon: "💰" },
	{ name: "Operations", code: "OPS", icon: "⚙️" },
	{ name: "Product", code: "PRD", icon: "🎯" },
	{ name: "Legal", code: "LEG", icon: "⚖️" },
];

const taskTitles = [
	"Review quarterly financial report",
	"Update client documentation",
	"Fix login authentication bug",
	"Implement new dashboard feature",
	"Conduct code review for PR #",
	"Schedule team meeting",
	"Analyze user feedback data",
	"Optimize database queries",
	"Design new landing page",
	"Update security protocols",
	"Prepare investor presentation",
	"Migrate legacy system",
	"Train new team members",
	"Audit compliance requirements",
	"Refactor authentication module",
	"Create API documentation",
	"Setup CI/CD pipeline",
	"Research competitor analysis",
	"Develop mobile app prototype",
	"Implement payment gateway",
];

const requestTitles = [
	"Request access to production database",
	"Need approval for budget increase",
	"Request new laptop for development",
	"Approve overtime hours for project",
	"Request additional licenses",
	"Need permission to deploy to production",
	"Request training budget approval",
	"Approval needed for new hire",
	"Request access to analytics platform",
	"Need sign-off on contract terms",
	"Request vacation time approval",
	"Approval for marketing campaign spend",
	"Request infrastructure upgrade",
	"Need approval for vendor contract",
	"Request team expansion",
];

const descriptions = [
	"This is a high priority task that needs immediate attention.",
	"Please review and provide feedback by end of week.",
	"Urgent: Client deadline approaching soon.",
	"Low priority, can be completed when time permits.",
	"This requires coordination with multiple teams.",
	"Blocking other work, please prioritize.",
	"Follow-up from last week's meeting.",
	"Part of Q4 strategic initiatives.",
	"Customer-requested enhancement.",
	"Technical debt that needs addressing.",
];

export async function seed() {
	console.log("🌱 Starting database seed...");

	const now = new Date();
	const oneYearAgo = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate(),
	);

	// Create users
	console.log("👥 Creating users...");
	const userIds: string[] = [];
	const users: (typeof usersTable.$inferSelect)[] = [];

	// Import auth dynamically to avoid issues if not needed elsewhere
	const { auth } = await import("~/lib/auth");

	for (let i = 0; i < 20; i++) {
		const firstName = randomPick(firstNames);
		const lastName = randomPick(lastNames);
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
		const password = "password";

		try {
			// Use better-auth to create user and handle password hashing
			const result = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name: `${firstName} ${lastName}`,
					image: `https://i.pravatar.cc/150?u=${email}`,
				},
			});

			if (result?.user) {
				userIds.push(result.user.id);
				users.push(result.user as typeof usersTable.$inferSelect);
			}
		} catch (error) {
			console.error(`Failed to create user ${email}:`, error);
		}
	}

	console.log(`✅ Created ${users.length} users`);

	// Create organizations
	console.log("🏢 Creating organizations...");
	const orgIds: string[] = [];
	const orgs = [];

	for (const orgData of orgNames) {
		const orgId = createId();
		orgIds.push(orgId);
		orgs.push({
			id: orgId,
			name: orgData.name,
			slug: orgData.slug,
			logo: null,
			createdAt: randomDate(oneYearAgo, now),
			metadata: null,
		});
	}

	// Upsert organizations to ensure we have them and get their IDs
	const createdOrgs = await db
		.insert(organizationsTable)
		.values(orgs)
		.onConflictDoUpdate({
			target: organizationsTable.slug,
			set: { name: sql`EXCLUDED.name` }, // Dummy update to ensure return
		})
		.returning({ id: organizationsTable.id, slug: organizationsTable.slug });

	// Update orgIds with actual IDs from DB
	orgIds.length = 0; // Clear array
	for (const org of createdOrgs) {
		orgIds.push(org.id);
	}

	console.log(`✅ Created/Updated ${createdOrgs.length} organizations`);

	// Create members for each org
	console.log("👔 Creating organization members...");
	let totalMembers = 0;

	for (const orgId of orgIds) {
		const orgIndex = orgIds.indexOf(orgId);
		// Each org gets 8-12 members
		const memberCount = 8 + Math.floor(Math.random() * 5);
		// Ensure we don't try to pick more users than we have
		const availableUsers = userIds.length > 0 ? userIds : [];

		if (availableUsers.length === 0) {
			console.warn("No users available to add to organization");
			continue;
		}

		const selectedUsers = randomPickMultiple(
			availableUsers,
			Math.min(memberCount, availableUsers.length),
		);

		for (let i = 0; i < selectedUsers.length; i++) {
			const userId = selectedUsers[i];
			const role =
				i === 0
					? membershipRole.owner
					: i < 3
						? membershipRole.admin
						: membershipRole.member;

			await db.insert(membersTable).values({
				id: createId(),
				organizationId: orgId,
				userId,
				role,
				createdAt: randomDate(oneYearAgo, now),
			});
			totalMembers++;
		}
	}

	console.log(`✅ Created ${totalMembers} organization memberships`);

	// Create workspaces, labels, and statuses
	console.log("📂 Creating workspaces, labels, and statuses...");
	const workspaceData: Array<{
		id: string;
		orgId: string;
		code: string;
		statusIds: string[];
		labelIds: string[];
		memberIds: string[];
	}> = [];

	for (const orgId of orgIds) {
		// Get org members
		const orgMembers = await db
			.select({ userId: membersTable.userId })
			.from(membersTable)
			.where(eq(membersTable.organizationId, orgId));

		// Create 2-3 workspaces per org
		const workspaceCount = 2 + Math.floor(Math.random() * 2);
		const selectedWorkspaces = randomPickMultiple(
			workspaceNames,
			workspaceCount,
		);

		for (const wsData of selectedWorkspaces) {
			const workspaceId = createId();
			const code = `${wsData.code}${orgIds.indexOf(orgId) + 1}`;

			// Create workspace
			const [workspace] = await db
				.insert(workspacesTable)
				.values({
					id: workspaceId,
					orgId,
					name: wsData.name,
					slug: wsData.name.toLowerCase().replace(/\s+/g, "-"),
					code,
					icon: wsData.icon,
					description: `${wsData.name} workspace for ${orgs.find((o) => o.id === orgId)?.name}`,
					visibility: workspaceVisibility.private,
					nextShortId: 1,
					archived: false,
					archivedAt: null,
					createdAt: randomDate(oneYearAgo, now),
					updatedAt: now,
					deletedAt: null,
				})
				.onConflictDoUpdate({
					target: [workspacesTable.orgId, workspacesTable.slug],
					set: { name: sql`EXCLUDED.name` }, // Dummy update
				})
				.returning({ id: workspacesTable.id });

			// Use the returned ID (which might be different if it already existed)
			const actualWorkspaceId = workspace.id;

			// Create workspace labels (shared at org level but track for this workspace)
			const labelIds: string[] = [];
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

			for (let i = 0; i < 5; i++) {
				const labelId = createId();
				labelIds.push(labelId);

				await db
					.insert(labelsTable)
					.values({
						id: labelId,
						orgId,
						name: `${labelNames[i]} - ${wsData.name}`,
						color: labelColors[i],
						description: `Label for ${labelNames[i]} items`,
						archived: false,
						creatorId: orgMembers[0].userId,
						createdAt: now,
						updatedAt: now,
						deletedAt: null,
					})
					.onConflictDoNothing();
			}

			// Create statuses for workspace
			const statusIds: string[] = [];
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

			// Add request-specific statuses
			const requestStatusConfigs = [
				{
					name: "Pending Approval",
					color: "#f59e0b",
					type: statusType.pendingApproval,
					isDefault: false,
					isRequestStatus: true,
				},
				{
					name: "Approved",
					color: "#22c55e",
					type: statusType.approved,
					isDefault: false,
					isRequestStatus: true,
				},
				{
					name: "Rejected",
					color: "#ef4444",
					type: statusType.rejected,
					isDefault: false,
					isRequestStatus: true,
				},
			];

			const allStatuses = [...statusConfigs, ...requestStatusConfigs];

			for (let i = 0; i < allStatuses.length; i++) {
				const statusId = createId();
				statusIds.push(statusId);

				await db
					.insert(statusesTable)
					.values({
						id: statusId,
						workspaceId: actualWorkspaceId,
						name: allStatuses[i].name,
						color: allStatuses[i].color,
						type: allStatuses[i].type,
						position: i,
						isDefault: allStatuses[i].isDefault,
						archived: false,
						isRequestStatus:
							allStatuses[i].type === "pending_approval" || false,
						creatorId: orgMembers[0].userId,
						createdAt: now,
						updatedAt: now,
						deletedAt: null,
					})
					.onConflictDoNothing();
			}

			// Create workspace memberships
			const workspaceMembers = randomPickMultiple(
				orgMembers.map((m) => m.userId),
				Math.min(5 + Math.floor(Math.random() * 3), orgMembers.length),
			);

			for (let i = 0; i < workspaceMembers.length; i++) {
				const userId = workspaceMembers[i];
				const role =
					i === 0
						? workspaceRole.manager
						: i < 2
							? workspaceRole.member
							: workspaceRole.viewer;

				await db
					.insert(workspaceMembershipsTable)
					.values({
						id: createId(),
						workspaceId: actualWorkspaceId,
						userId,
						orgId,
						role,
						status: membershipStatus.active,
						canCreateTasks:
							role === workspaceRole.manager || role === workspaceRole.member,
						canCreateRequests: true,
						canApproveRequests: role === workspaceRole.manager,
						canManageMembers: role === workspaceRole.manager,
						canManageWorkspace: role === workspaceRole.manager,
						createdAt: randomDate(oneYearAgo, now),
						updatedAt: now,
						deletedAt: null,
					})
					.onConflictDoNothing();
			}

			workspaceData.push({
				id: actualWorkspaceId,
				orgId,
				code,
				statusIds,
				labelIds,
				memberIds: workspaceMembers,
			});
		}
	}

	console.log(
		`✅ Created ${workspaceData.length} workspaces with statuses and labels`,
	);

	// Create matters (requests and tasks) - LOTS OF THEM
	console.log("📝 Creating matters (this will take a moment)...");
	let totalMatters = 0;
	let totalRequests = 0;
	let totalTasks = 0;

	for (const workspace of workspaceData) {
		// Create 300-500 matters per workspace to get to thousands total
		const matterCount = 300 + Math.floor(Math.random() * 201);

		// Track short IDs for this workspace
		let currentShortId = 1;

		// Get task and request statuses
		const taskStatuses = workspace.statusIds.filter((_, idx) => idx < 6); // First 6 are task statuses
		const requestStatuses = workspace.statusIds.filter((_, idx) => idx >= 6); // Last 3 are request statuses

		for (let i = 0; i < matterCount; i++) {
			const matterId = createId();
			const isRequestType = Math.random() < 0.3; // 30% requests, 70% tasks
			const type = isRequestType ? matterType.request : matterType.task;

			const author = randomPick(workspace.memberIds);
			const assignee =
				Math.random() < 0.8 ? randomPick(workspace.memberIds) : null;

			// Select appropriate status based on type
			const selectedStatusId = isRequestType
				? randomPick(requestStatuses)
				: randomPick(taskStatuses);

			// Priority distribution: 5% urgent, 20% high, 50% medium, 25% low
			const priorityRand = Math.random();
			let priority: number;
			if (priorityRand < 0.05)
				priority = Priority.URGENT; // 0
			else if (priorityRand < 0.25)
				priority = Priority.HIGH; // 1
			else if (priorityRand < 0.75)
				priority = Priority.MEDIUM; // 2
			else priority = Priority.LOW; // 3

			const createdAt = randomDate(oneYearAgo, now);
			const title = isRequestType
				? randomPick(requestTitles)
				: randomPick(taskTitles);

			// Request-specific fields
			let approvalStatusValue = null;
			let approvedBy = null;
			let approvedAt = null;
			let convertedToTaskId = null;

			if (isRequestType) {
				const approvalRand = Math.random();
				if (approvalRand < 0.5) {
					approvalStatusValue = approvalStatus.pending;
				} else if (approvalRand < 0.85) {
					approvalStatusValue = approvalStatus.approved;
					approvedBy = randomPick(workspace.memberIds);
					approvedAt = randomDate(createdAt, now);
					// 70% of approved requests are converted to tasks
					if (Math.random() < 0.7) {
						convertedToTaskId = createId(); // Would reference actual task
					}
				} else {
					approvalStatusValue = approvalStatus.rejected;
					approvedBy = randomPick(workspace.memberIds);
					approvedAt = randomDate(createdAt, now);
				}
			}

			// Due date (50% have due dates)
			const dueDate =
				Math.random() < 0.5
					? randomDate(
							createdAt,
							new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
						)
					: null;

			await db.insert(mattersTable).values({
				id: matterId,
				shortID: currentShortId++,
				orgId: workspace.orgId,
				workspaceId: workspace.id,
				workspaceCode: workspace.code,
				authorId: author,
				assigneeId: assignee,
				statusId: selectedStatusId,
				title: `${title} ${currentShortId}`,
				description: randomPick(descriptions),
				type,
				priority,
				source: "web",
				approvalStatus: approvalStatusValue,
				approvedBy,
				approvedAt,
				rejectionReason:
					approvalStatusValue === approvalStatus.rejected
						? "Does not meet criteria"
						: null,
				convertedToTaskId,
				convertedFromRequestId: null,
				dueDate,
				startDate: Math.random() < 0.3 ? randomDate(createdAt, now) : null,
				completedAt:
					selectedStatusId === taskStatuses[4]
						? randomDate(createdAt, now)
						: null, // If status is "Done"
				estimatedHours:
					Math.random() < 0.6 ? Math.floor(Math.random() * 40) + 1 : null,
				actualHours: null,
				archived: Math.random() < 0.05, // 5% archived
				archivedAt: null,
				archivedBy: null,
				createdAt,
				updatedAt: randomDate(createdAt, now),
				deletedAt: null,
			});

			// Add labels to 60% of matters
			if (Math.random() < 0.6) {
				const labelCount = 1 + Math.floor(Math.random() * 3);
				const selectedLabels = randomPickMultiple(
					workspace.labelIds,
					labelCount,
				);

				for (const labelId of selectedLabels) {
					await db.insert(matterLabelsTable).values({
						matterId,
						labelId,
						createdAt: now,
						updatedAt: now,
						deletedAt: null,
					});
				}
			}

			// Add timeline entries for each matter
			// Creation event
			await db.insert(timelinesTable).values({
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

			// Add 1-5 additional timeline events (comments, changes)
			const timelineEventCount = 1 + Math.floor(Math.random() * 5);
			for (let j = 0; j < timelineEventCount; j++) {
				const timelineCreatedAt = randomDate(createdAt, now);
				const eventTypes = [
					timelineEventType.comment,
					timelineEventType.statusChange,
					timelineEventType.priorityChange,
				];

				await db.insert(timelinesTable).values({
					id: createId(),
					matterId,
					userId: randomPick(workspace.memberIds),
					type: randomPick(eventTypes),
					content: "Updated the matter with new information",
					fromStatusId: null,
					toStatusId: null,
					fromAssigneeId: null,
					toAssigneeId: null,
					labelId: null,
					fromValue: null,
					toValue: null,
					mentions: null,
					edited: false,
					editedAt: null,
					createdAt: timelineCreatedAt,
					updatedAt: timelineCreatedAt,
					deletedAt: null,
				});
			}

			if (isRequestType) totalRequests++;
			else totalTasks++;
			totalMatters++;

			// Progress indicator every 100 matters
			if (totalMatters % 100 === 0) {
				console.log(`  📊 Created ${totalMatters} matters so far...`);
			}
		}

		// Update workspace nextShortId
		await db
			.update(workspacesTable)
			.set({ nextShortId: currentShortId })
			.where(eq(workspacesTable.id, workspace.id));
	}

	console.log(
		`✅ Created ${totalMatters} matters (${totalRequests} requests, ${totalTasks} tasks)`,
	);

	console.log("\n🎉 Database seeding completed successfully!");
	console.log("\n📊 Summary:");
	console.log(`  - Users: ${users.length}`);
	console.log(`  - Organizations: ${orgs.length}`);
	console.log(`  - Workspaces: ${workspaceData.length}`);
	console.log(`  - Total Matters: ${totalMatters}`);
	console.log(`    - Requests: ${totalRequests}`);
	console.log(`    - Tasks: ${totalTasks}`);
}

import process from "node:process";
// Run seed if this file is executed directly
import { fileURLToPath } from "node:url";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	seed()
		.catch((error) => {
			console.error("❌ Seed failed:", error);
			process.exit(1);
		})
		.finally(() => {
			process.exit(0);
		});
}
