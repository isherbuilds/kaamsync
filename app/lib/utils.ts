import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// Core
// ============================================================================

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ============================================================================
// String Utilities
// ============================================================================

export const MAX_SLUG_LENGTH = 30;

export function sanitizeSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_SLUG_LENGTH);
}

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

// ============================================================================
// Date Utilities (Intl-based)
// ============================================================================

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

function isToday(date: Date): boolean {
	const today = new Date();
	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

function isTomorrow(date: Date): boolean {
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	return (
		date.getDate() === tomorrow.getDate() &&
		date.getMonth() === tomorrow.getMonth() &&
		date.getFullYear() === tomorrow.getFullYear()
	);
}

function isYesterday(date: Date): boolean {
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return (
		date.getDate() === yesterday.getDate() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getFullYear() === yesterday.getFullYear()
	);
}

function isThisYear(date: Date): boolean {
	const today = new Date();
	return date.getFullYear() === today.getFullYear();
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
	const d = new Date(date);
	const timestamp = d.getTime();

	if (!Number.isFinite(timestamp) || Number.isNaN(timestamp))
		return "Invalid Date";

	if (isToday(d)) return "Today";

	// Helper for tomorrow check respecting the reference date if provided
	const tomorrowOfNow = new Date(now);
	tomorrowOfNow.setDate(tomorrowOfNow.getDate() + 1);
	const isTomorrowRelative =
		d.getDate() === tomorrowOfNow.getDate() &&
		d.getMonth() === tomorrowOfNow.getMonth() &&
		d.getFullYear() === tomorrowOfNow.getFullYear();

	if (isTomorrowRelative) return "Tomorrow";

	const diffMs = timestamp - now.getTime();

	// Past dates (including yesterday) are overdue
	if (diffMs < 0) return "Overdue";

	const diffHours = Math.floor(diffMs / MS_HOUR);
	if (diffHours < 24) return `${diffHours}hrs`;

	const diffDays = Math.floor(diffMs / MS_DAY);
	if (diffDays < 7) return `${diffDays}D`;

	const diffWeeks = Math.floor(diffDays / 7);
	return `${diffWeeks}W`;
}

/**
 * Format a timestamp for timeline/activity display.
 * Shows: just now, Xm ago, Xh ago, Xd ago, or "Mon DD" for older dates.
 */
export function formatTimelineDate(timestamp: number): string {
	if (!Number.isFinite(timestamp) || Number.isNaN(timestamp) || timestamp < 0)
		return "";

	const d = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffHours = diffMs / MS_HOUR;

	// Future dates - show absolute date
	if (diffMs < 0) {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: isThisYear(d) ? undefined : "numeric",
		}).format(d);
	}

	if (isToday(d)) {
		if (diffHours < 1) {
			const minutes = Math.floor(diffMs / MS_MINUTE);
			return minutes < 1 ? "Just Now" : `${minutes}m ago`;
		}
		return `${Math.floor(diffHours)}h ago`;
	}

	if (isYesterday(d)) {
		const timeStr = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			minute: "numeric",
			hour12: true,
		}).format(d);
		return `Yesterday at ${timeStr}`;
	}

	const days = Math.floor(diffMs / MS_DAY);
	if (days < 7) {
		return `${days}d ago`;
	}

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: isThisYear(d) ? undefined : "numeric",
	}).format(d);
}

/**
 * Format an absolute date (e.g., for created/updated timestamps).
 */
export function formatDate(ms: number): string {
	if (!Number.isFinite(ms) || Number.isNaN(ms)) return "";

	try {
		return new Date(ms).toLocaleDateString("en-US", {
			month: "numeric",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
}
