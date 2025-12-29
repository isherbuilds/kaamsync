import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const MAX_SLUG_LENGTH = 30;

export function sanitizeSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_SLUG_LENGTH);
}

// ============================================================================
// Date Formatting Utilities (using native Intl - no date-fns dependency)
// ============================================================================

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

/** Check if timestamp is today */
function isToday(timestamp: number | Date): boolean {
	const date = new Date(timestamp);
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

/** Check if timestamp is tomorrow */
function isTomorrow(timestamp: number | Date): boolean {
	const date = new Date(timestamp);
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return (
		date.getDate() === tomorrow.getDate() &&
		date.getMonth() === tomorrow.getMonth() &&
		date.getFullYear() === tomorrow.getFullYear()
	);
}

/**
 * Format a date for due date display (compact relative format).
 * Shows: Today, Tomorrow, Overdue, Xhrs, Xdays, Xweeks
 */
export function formatCompactRelativeDate(
	date: Date | number | string,
	nowDate?: Date,
): string {
	const now = nowDate || new Date();
	const timestamp = new Date(date).getTime();

	if (isToday(timestamp)) return "Today";
	if (isTomorrow(timestamp)) return "Tomorrow";

	const diffMs = timestamp - now.getTime();

	// Past dates (including yesterday) are overdue
	if (diffMs < 0) return "Overdue";

	const diffHours = Math.floor(diffMs / MS_HOUR);
	if (diffHours < 24) return `${diffHours}hrs`;

	const diffDays = Math.floor(diffMs / MS_DAY);
	if (diffDays < 7) return `${diffDays}days`;

	const diffWeeks = Math.floor(diffDays / 7);
	return `${diffWeeks}weeks`;
}

/**
 * Format a timestamp for timeline/activity display.
 * Shows: just now, Xm ago, Xh ago, Xd ago, or "Mon DD" for older dates.
 */
export function formatTimelineDate(timestamp: number): string {
	if (!timestamp || Number.isNaN(timestamp) || timestamp < 0) return "";

	const date = new Date(timestamp);
	const now = Date.now();
	const diff = now - timestamp;

	// Future dates - show absolute date
	if (diff < 0) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year:
				date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
		});
	}

	const minutes = Math.floor(diff / MS_MINUTE);
	const hours = Math.floor(diff / MS_HOUR);
	const days = Math.floor(diff / MS_DAY);

	if (days > 7) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year:
				date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
		});
	}

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "just now";
}

/**
 * Format an absolute date (e.g., for created/updated timestamps).
 */
export function formatDate(ms: number): string {
	if (!ms || Number.isNaN(ms)) return "";
	try {
		return new Date(ms).toLocaleDateString(undefined, {
			month: "numeric",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
}

// ============================================================================
// Other Utilities
// ============================================================================

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
	return name
		.split(" ")
		.filter((n) => n.length > 0)
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}
