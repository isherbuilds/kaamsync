import { type ClassValue, clsx } from "clsx";
import {
	formatDistanceToNow,
	isToday,
	isTomorrow,
	isYesterday,
} from "date-fns";
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

// * Date Formatters Formatter

// --- Absolute Date Formatter ---
export function formatDate(ms: number): string {
	if (!ms || Number.isNaN(ms)) {
		return "";
	}
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

// --- Absolute Date Formatter ---
export function formatDateTime(ms: number): string {
	if (!ms || Number.isNaN(ms)) {
		return "";
	}

	return new Date(ms).toLocaleString();
}

// --- Relative Date Formatter ---
export function formatRelativeDate(timestamp: number, due?: boolean): string {
	const date = timestamp;

	if (isToday(date)) {
		return "Today";
	}
	if (isYesterday(date)) {
		return due ? "Overdue" : "Yesterday";
	}

	return formatDistanceToNow(date);
}

// --- Relative Date Formatter ---
export function formatRelativeDateTime(timestamp: number): string {
	const now = new Date();
	const date = new Date(timestamp);
	const diffMs = now.getTime() - date.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (diffMinutes < 60) {
		return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
	}

	const diffHours = Math.floor(diffMinutes / 60);

	if (diffHours < 24) {
		return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
	}

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

export function formatCompactRelativeDate(
	date: Date | number | string,
	nowDate?: Date,
): string {
	const now = nowDate || new Date();

	if (isToday(date)) {
		return "Today";
	}

	if (isYesterday(date)) {
		return "Overdue";
	}

	if (isTomorrow(date)) {
		return "Tomorrow";
	}

	const diffMs = new Date(date).getTime() - now.getTime();
	const isPastDate = diffMs < 0;
	const absDiffMs = Math.abs(diffMs);
	const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

	if (isPastDate) {
		return "Overdue";
	}

	if (diffHours < 24) {
		return `${diffHours}hrs`;
	}

	if (diffDays < 7) {
		return `${diffDays}days`;
	}

	const diffWeeks = Math.floor(diffDays / 7);
	return `${diffWeeks}weeks`;
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

/**
 * Format a timestamp to a human-readable relative date string
 * Shows "just now", "Xm ago", "Xh ago", "Xd ago" for recent dates,
 * falls back to "Mon DD" or "Mon DD, YYYY" for older dates
 */
export function formatTimelineDate(timestamp: number): string {
	if (!timestamp || Number.isNaN(timestamp) || timestamp < 0) {
		return "";
	}

	const date = new Date(timestamp);
	const now = Date.now();
	const diff = now - timestamp;

	// Handle future dates
	if (diff < 0) {
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year:
				date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
		});
	}

	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
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
