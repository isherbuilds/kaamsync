import { timestamp } from "drizzle-orm/pg-core";

export const timestampColumns = {
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
};

export const deletedAtColumn = {
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const commonColumns = {
	...timestampColumns,
	...deletedAtColumn,
};

// ==================== HELPER FUNCTIONS ====================

const MATTER_KEY_REGEX = /^([A-Z0-9]+)-(\d+)$/;

/**
 * Generate matter display key from workspace code and shortID
 * @example getMatterKey("HOSP1", 1234) // Returns: "HOSP1-1234"
 */
export function getMatterKey(workspaceCode: string, shortID: number): string {
	return `${workspaceCode}-${shortID}`;
}

/**
 * Parse matter key back to components
 * @example parseMatterKey("HOSP1-1234") // Returns: { code: "HOSP1", shortID: 1234 }
 */
export function parseMatterKey(
	key: string,
): { code: string; shortID: number } | null {
	const match = MATTER_KEY_REGEX.exec(key);
	if (!match) {
		return {
			code: "",
			shortID: 0,
		};
	}
	return {
		code: match[1],
		shortID: Number.parseInt(match[2], 10),
	};
}

export const matterType = {
	request: "request",
	task: "task",
} as const;

export const workspaceVisibility = {
	private: "private",
	public: "public",
} as const;

export const orgRole = {
	owner: "owner",
	admin: "admin",
	member: "member",
} as const;

export const membershipStatus = {
	active: "active",
	inactive: "inactive",
	pending: "pending",
} as const;

export const statusType = {
	backlog: "backlog",
	notStarted: "not_started",
	started: "started",
	completed: "completed",
	canceled: "canceled",
	pendingApproval: "pending_approval",
	approved: "approved",
	rejected: "rejected",
} as const;

// Status types specific to requests (approval workflow)
export const REQUEST_STATUS_TYPES = new Set([
	statusType.pendingApproval,
	statusType.approved,
	statusType.rejected,
]);

// Status types specific to tasks
export const TASK_STATUS_TYPES = new Set([
	statusType.backlog,
	statusType.notStarted,
	statusType.started,
	statusType.completed,
	statusType.canceled,
]);

export const approvalStatus = {
	pending: "pending",
	approved: "approved",
	rejected: "rejected",
} as const;

export const workspaceRole = {
	viewer: "viewer", // Read-only access
	member: "member", // Can create requests, limited task creation
	manager: "manager", // Can create tasks, approve requests, manage workspace
} as const;

export type WorkspaceRole = (typeof workspaceRole)[keyof typeof workspaceRole];

export const watcherReason = {
	oversight: "oversight", // For principals watching accountants
	interestedParty: "interested_party", // Wants to stay informed
	collaborator: "collaborator", // Working together but not assignee
	coordinator: "coordinator", // Coordinating between teams
} as const;

export const timelineEventType = {
	created: "created",
	comment: "comment",
	statusChange: "status_change",
	assigned: "assigned",
	priorityChange: "priority_change",
	dueDateChange: "due_date_change",
	labelAdded: "label_added",
	labelRemoved: "label_removed",
	requestApproved: "request_approved",
	requestRejected: "request_rejected",
	requestConverted: "request_converted", // When request becomes task
	watcherAdded: "watcher_added",
	watcherRemoved: "watcher_removed",
} as const;

// ==================== HELPER FUNCTIONS FOR REQUEST/TASK ====================

/**
 * Check if a matter is a request type
 */
export function isRequest(matterType: string): boolean {
	return matterType === "request";
}

/**
 * Check if a matter is a task type
 */
export function isTask(matterType: string): boolean {
	return matterType === "task";
}

/**
 * Check if a request is pending approval
 */
export function isPendingApproval(approvalStatus?: string | null): boolean {
	return approvalStatus === "pending";
}

/**
 * Check if a request is approved
 */
export function isApproved(approvalStatus?: string | null): boolean {
	return approvalStatus === "approved";
}

/**
 * Check if a request is rejected
 */
export function isRejected(approvalStatus?: string | null): boolean {
	return approvalStatus === "rejected";
}
