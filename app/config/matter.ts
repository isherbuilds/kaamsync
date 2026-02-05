import type { LucideIcon } from "lucide-react/dist/lucide-react";
import {
	BacklogStatusIcon,
	CanceledStatusIcon,
	CompletedStatusIcon,
	type IconProps,
	NotStartedStatusIcon,
	PendingApprovalStatusIcon,
	StartedStatusIcon,
} from "~/components/shared/icons";

// =============================================================================
// PRIORITY CONFIGURATION
// =============================================================================

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
	[Priority.URGENT]: "text-priority-urgent",
	[Priority.HIGH]: "text-priority-high",
	[Priority.MEDIUM]: "text-priority-medium",
	[Priority.LOW]: "text-priority-low",
	[Priority.NONE]: "text-priority-none",
};

// Priority Badge styles (keyed by numeric value)
export const PRIORITY_BADGE: Record<PriorityValue, string> = {
	[Priority.URGENT]:
		"bg-priority-urgent/10 text-priority-urgent border-priority-urgent/20",
	[Priority.HIGH]:
		"bg-priority-high/10 text-priority-high border-priority-high/20",
	[Priority.MEDIUM]:
		"bg-priority-medium/10 text-priority-medium border-priority-medium/20",
	[Priority.LOW]: "bg-priority-low/10 text-priority-low border-priority-low/20",
	[Priority.NONE]:
		"bg-priority-none/10 text-priority-none border-priority-none/20",
};

// =============================================================================
// PRIORITY HELPERS
// =============================================================================

export function getPriorityColorClass(priority: number): string {
	return (
		PRIORITY_COLORS[priority as PriorityValue] ?? PRIORITY_COLORS[Priority.NONE]
	);
}

export function getPriorityDisplayLabel(priority: number): string {
	return (
		PRIORITY_LABELS[priority as PriorityValue] ?? PRIORITY_LABELS[Priority.NONE]
	);
}

export function getPriorityBadgeClass(priority: number): string {
	return (
		PRIORITY_BADGE[priority as PriorityValue] ?? PRIORITY_BADGE[Priority.NONE]
	);
}

// =============================================================================
// STATUS CONFIGURATION
// =============================================================================

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
	backlog: "text-muted-foreground",
	not_started: "text-muted-foreground",
	started: "text-status-progress",
	completed: "text-status-completed",
	canceled: "text-muted-foreground",
	pending_approval: "text-status-pending",
	approved: "text-status-approved",
	rejected: "text-status-rejected",
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

// =============================================================================
// STATUS HELPERS
// =============================================================================

export function getStatusIconComponent(statusType?: string): MatterIcon | null {
	if (!statusType) return null;
	return STATUS_TYPE_ICONS[statusType as StatusType] ?? null;
}

export function getStatusDisplayLabel(statusType?: string): string {
	if (!statusType) return "Unknown";
	return STATUS_TYPE_LABELS[statusType as StatusType] ?? statusType;
}

export function isStatusCompleted(statusType?: string): boolean {
	if (!statusType) return false;
	return COMPLETED_STATUS_TYPES.includes(statusType as StatusType);
}

// =============================================================================
// SORTING COMPARATORS
// =============================================================================

const cmp = (a: number, b: number) => (a !== b ? a - b : 0);

export function sortStatusComparator(
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

export function sortStatusesByType<
	T extends {
		type?: string | null;
		position?: number | null;
		name?: string | null;
	},
>(statuses: T[]): T[] {
	return statuses.slice().sort(sortStatusComparator);
}

export function sortTaskComparator(
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
