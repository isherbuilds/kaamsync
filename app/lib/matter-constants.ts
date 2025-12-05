import type { LucideIcon } from "lucide-react";
import {
	BacklogStatusIcon,
	CanceledStatusIcon,
	CompletedStatusIcon,
	type IconProps,
	NotStartedStatusIcon,
	PendingApprovalStatusIcon,
	StartedStatusIcon,
} from "~/components/icons";

// Priority Types - Numeric values for database storage and server-side sorting
// 0 = urgent (highest), 4 = none (lowest)
export const Priority = {
	URGENT: 0,
	HIGH: 1,
	MEDIUM: 2,
	LOW: 3,
	NONE: 4,
} as const;

export type PriorityValue = (typeof Priority)[keyof typeof Priority];

// Priority labels for display
export const PRIORITY_LABELS: Record<PriorityValue, string> = {
	[Priority.URGENT]: "Urgent",
	[Priority.HIGH]: "High",
	[Priority.MEDIUM]: "Medium",
	[Priority.LOW]: "Low",
	[Priority.NONE]: "None",
};

// Priority Colors for cards (keyed by numeric value)
export const PRIORITY_COLORS: Record<PriorityValue, string> = {
	[Priority.URGENT]: "text-red-600 dark:text-red-400",
	[Priority.HIGH]: "text-orange-600 dark:text-orange-400",
	[Priority.MEDIUM]: "text-blue-600 dark:text-blue-400",
	[Priority.LOW]: "text-gray-600 dark:text-gray-400",
	[Priority.NONE]: "text-gray-500 dark:text-gray-500",
};

// Priority Badge styles (keyed by numeric value)
export const PRIORITY_BADGE: Record<PriorityValue, string> = {
	[Priority.URGENT]:
		"bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900",
	[Priority.HIGH]:
		"bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900",
	[Priority.MEDIUM]:
		"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900",
	[Priority.LOW]:
		"bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-900",
	[Priority.NONE]:
		"bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950/20 dark:text-gray-500 dark:border-gray-900",
};

// Helper to get priority color
export function getPriorityColor(priority: number): string {
	return (
		PRIORITY_COLORS[priority as PriorityValue] ?? PRIORITY_COLORS[Priority.NONE]
	);
}

// Helper to get priority label
export function getPriorityLabel(priority: number): string {
	return (
		PRIORITY_LABELS[priority as PriorityValue] ?? PRIORITY_LABELS[Priority.NONE]
	);
}

// Helper to get priority badge
export function getPriorityBadge(priority: number): string {
	return (
		PRIORITY_BADGE[priority as PriorityValue] ?? PRIORITY_BADGE[Priority.NONE]
	);
}

// Status Types - These are the main categories (hardcoded)
export const STATUS_TYPES = {
	backlog: "backlog",
	not_started: "not_started",
	started: "started",
	completed: "completed",
	canceled: "canceled",
	// REQUEST-specific statuses
	pending_approval: "pending_approval",
	approved: "approved",
	rejected: "rejected",
} as const;

export type StatusType = keyof typeof STATUS_TYPES;

// Status Type Icons (hardcoded, cannot be changed)
export type MatterIcon = LucideIcon | React.FC<IconProps>;

export const STATUS_TYPE_ICONS: Record<StatusType, MatterIcon> = {
	backlog: BacklogStatusIcon,
	not_started: NotStartedStatusIcon,
	started: StartedStatusIcon,
	completed: CompletedStatusIcon,
	canceled: CanceledStatusIcon,
	pending_approval: PendingApprovalStatusIcon,
	approved: CompletedStatusIcon,
	rejected: CanceledStatusIcon,
};

// Status Type Labels
export const STATUS_TYPE_LABELS: Record<StatusType, string> = {
	backlog: "Backlog",
	not_started: "Not Started",
	started: "Started",
	completed: "Completed",
	canceled: "Canceled",
	pending_approval: "Pending Approval",
	approved: "Approved",
	rejected: "Rejected",
};

// Status Type Colors (default colors, can be customized per status)
export const STATUS_TYPE_COLORS: Record<StatusType, string> = {
	backlog: "text-gray-500 dark:text-gray-600",
	not_started: "text-gray-400 dark:text-gray-600",
	started: "text-yellow-400 dark:text-yellow-600",
	completed: "text-green-500 dark:text-green-600",
	canceled: "text-gray-600 dark:text-gray-600",
	pending_approval: "text-yellow-600 dark:text-yellow-600",
	approved: "text-green-500 dark:text-green-600",
	rejected: "text-red-500 dark:text-red-600",
};

// Hardcoded type order for grouping/sorting
export const STATUS_TYPE_ORDER: Record<StatusType, number> = {
	pending_approval: 0,
	backlog: 1,
	not_started: 2,
	started: 3,
	approved: 4,
	completed: 5,
	rejected: 6,
	canceled: 7,
} as const;

// Active status types (shown by default)
export const ACTIVE_STATUS_TYPES: StatusType[] = [
	"pending_approval",
	"not_started",
	"started",
	"backlog",
];

// Completed status types (hidden by default, shown with toggle)
export const COMPLETED_STATUS_TYPES: StatusType[] = [
	"completed",
	"canceled",
	"approved",
	"rejected",
];

// Helper to get status icon
export function getStatusIcon(statusType?: string): MatterIcon | null {
	if (!statusType) return null;
	return STATUS_TYPE_ICONS[statusType as StatusType] ?? null;
}

// Helper to get status label
export function getStatusLabel(statusType?: string): string {
	if (!statusType) return "Unknown";
	return STATUS_TYPE_LABELS[statusType as StatusType] ?? statusType;
}

// Helper to check if status is completed
export function isCompletedStatus(statusType?: string): boolean {
	if (!statusType) return false;
	return COMPLETED_STATUS_TYPES.includes(statusType as StatusType);
}

// Helper to compare two values with fallback
const cmp = (a: number, b: number) => (a !== b ? a - b : 0);

// Compare statuses by type → position → name
export function compareStatuses(
	a: { type?: string | null; position?: number | null; name?: string | null },
	b: { type?: string | null; position?: number | null; name?: string | null },
): number {
	return (
		cmp(
			STATUS_TYPE_ORDER[(a.type ?? "not_started") as StatusType] ?? 99,
			STATUS_TYPE_ORDER[(b.type ?? "not_started") as StatusType] ?? 99,
		) ||
		cmp(
			a.position ?? Number.POSITIVE_INFINITY,
			b.position ?? Number.POSITIVE_INFINITY,
		) ||
		(a.name ?? "").localeCompare(b.name ?? "")
	);
}

// Sort statuses
export function sortStatuses<
	T extends {
		type?: string | null;
		position?: number | null;
		name?: string | null;
	},
>(statuses: T[]): T[] {
	return statuses.slice().sort(compareStatuses);
}

// Compare tasks by priority → due date → createdAt → name
export function compareTasks(
	a: {
		priority?: number | null;
		dueDate?: string | number | null;
		createdAt?: string | number | null;
		title?: string | null;
		name?: string | null;
	},
	b: {
		priority?: number | null;
		dueDate?: string | number | null;
		createdAt?: string | number | null;
		title?: string | null;
		name?: string | null;
	},
): number {
	return (
		cmp(a.priority ?? Priority.NONE, b.priority ?? Priority.NONE) ||
		cmp(
			a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY,
			b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY,
		) ||
		cmp(
			a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY,
			b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY,
		) ||
		(a.title || a.name || "").localeCompare(b.title || b.name || "")
	);
}
