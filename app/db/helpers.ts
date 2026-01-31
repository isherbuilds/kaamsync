import { timestamp } from "drizzle-orm/pg-core";

// ==================== DRIZZLE COLUMN HELPERS ====================

export const generalColumns = {
	createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
};

export const deletedAtColumn = {
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const commonColumns = {
	...generalColumns,
	...deletedAtColumn,
};

// ==================== MATTER KEY HELPERS ====================

const MATTER_KEY_REGEX = /^([A-Z0-9]+)-(\d+)$/;

/**
 * Format matter display key from team code and shortID
 * @example formatMatterKey("HOSP1", 1234) // Returns: "HOSP1-1234"
 */
export function formatMatterKey(teamCode: string, shortID: number): string {
	return `${teamCode}-${shortID}`;
}

/**
 * Parse matter key string back to components
 * @example parseMatterKeyString("HOSP1-1234") // Returns: { code: "HOSP1", shortID: 1234 }
 */
export function parseMatterKeyString(
	key: string,
): { code: string; shortID: number } | null {
	const match = MATTER_KEY_REGEX.exec(key);
	if (!match) {
		return null;
	}
	return {
		code: match[1],
		shortID: Number.parseInt(match[2], 10),
	};
}

// ==================== ENUMS/CONSTANTS ====================

export const matterType = {
	request: "request",
	task: "task",
} as const;

export const teamVisibility = {
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

export const REQUEST_STATUS_TYPES = new Set([
	statusType.pendingApproval,
	statusType.approved,
	statusType.rejected,
]);

export const TASK_STATUS_TYPES = new Set([
	statusType.backlog,
	statusType.notStarted,
	statusType.started,
	statusType.completed,
	statusType.canceled,
]);

export const teamRole = {
	viewer: "viewer",
	member: "member",
	manager: "manager",
} as const;

export type TeamRole = (typeof teamRole)[keyof typeof teamRole];

export const watcherReason = {
	oversight: "oversight",
	interestedParty: "interested_party",
	collaborator: "collaborator",
	coordinator: "coordinator",
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
	requestConverted: "request_converted",
	watcherAdded: "watcher_added",
	watcherRemoved: "watcher_removed",
} as const;

// ==================== TYPE HELPERS ====================

/**
 * Check if a matter is a request type
 */
export function isMatterTypeRequest(type: string): boolean {
	return type === "request";
}

/**
 * Check if a matter is a task type
 */
export function isMatterTypeTask(type: string): boolean {
	return type === "task";
}

/**
 * Check if a request approval status is pending
 */
export function isApprovalPending(approvalStatus?: string | null): boolean {
	return approvalStatus === "pending";
}

/**
 * Check if a request approval status is approved
 */
export function isApprovalApproved(approvalStatus?: string | null): boolean {
	return approvalStatus === "approved";
}

/**
 * Check if a request approval status is rejected
 */
export function isApprovalRejected(approvalStatus?: string | null): boolean {
	return approvalStatus === "rejected";
}
