/**
 * @file Core utility functions and helpers
 * @description Common utilities used throughout the application including class merging,
 * string operations (slug generation, initials), and date formatting functions.
 *
 * Key exports:
 * - cn() - Merges Tailwind classes with clsx and twMerge
 * - toUrlSlug() - Converts strings to URL-safe slugs (max 30 chars)
 * - extractNameInitials() - Extracts initials from names (e.g., "John Doe" → "JD")
 * - formatAbsoluteDate() - Formats Date → MM/DD/YYYY
 * - formatDueDateLabel() - Formats due dates (Today, Tomorrow, Overdue, Xhrs, Xdays)
 * - formatActivityTimestamp() - Formats for activity timeline (Just Now, Xm ago, Yesterday at X)
 *
 * @see app/lib/validations/shared.ts for slug validation schemas
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// CORE UTILITIES
// ============================================================================

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

export const MAX_SLUG_LENGTH = 64;

const SLUG_REGEX = /[^a-z0-9-_]+/g;
const TRIM_DASH_REGEX = /^-+/g;

export function toUrlSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(SLUG_REGEX, "")
		.replace(TRIM_DASH_REGEX, "")
		.slice(0, MAX_SLUG_LENGTH);
}

export function extractNameInitials(name: string): string {
	let result = "";
	let count = 0;
	let takeNext = true;

	for (let i = 0; i < name.length && count < 2; i++) {
		const char = name[i];
		if (takeNext && char !== " ") {
			result += char.toUpperCase();
			count++;
			takeNext = false;
		} else if (char === " ") {
			takeNext = true;
		}
	}

	return result;
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

const MS_MINUTE = 60 * 1000;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;

function isToday(date: Date, now = new Date()): boolean {
	return (
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()
	);
}

function isTomorrow(date: Date, now = new Date()): boolean {
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return (
		date.getDate() === tomorrow.getDate() &&
		date.getMonth() === tomorrow.getMonth() &&
		date.getFullYear() === tomorrow.getFullYear()
	);
}

function isYesterday(date: Date, now = new Date()): boolean {
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	return (
		date.getDate() === yesterday.getDate() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getFullYear() === yesterday.getFullYear()
	);
}

function isThisYear(date: Date, now = new Date()): boolean {
	return date.getFullYear() === now.getFullYear();
}

/**
 * Format a due date with a compact relative label.
 * Shows: Today, Tomorrow, Overdue, Xhrs, Xdays, Xweeks
 */
export function formatDueDateLabel(
	date: Date | number | string,
	nowDate?: Date,
): string {
	const now = nowDate || new Date();
	const d = new Date(date);
	const timestamp = d.getTime();

	if (!Number.isFinite(timestamp) || Number.isNaN(timestamp)) {
		return "Invalid Date";
	}

	if (isToday(d, now)) return "Today";
	if (isTomorrow(d, now)) return "Tomorrow";

	const diffMs = timestamp - now.getTime();

	if (diffMs < 0) return "Overdue";

	const diffHours = Math.floor(diffMs / MS_HOUR);
	if (diffHours < 24) return `${diffHours}hrs`;

	const diffDays = Math.floor(diffMs / MS_DAY);
	if (diffDays < 7) return `${diffDays}D`;

	const diffWeeks = Math.floor(diffDays / 7);
	return `${diffWeeks}W`;
}

/**
 * Format a timestamp for activity timeline display.
 * Shows: just now, Xm ago, Xh ago, Xd ago, or "Mon DD" for older dates.
 */
export function formatActivityTimestamp(timestamp: number): string {
	if (!Number.isFinite(timestamp) || Number.isNaN(timestamp) || timestamp < 0) {
		return "";
	}

	const d = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffHours = diffMs / MS_HOUR;

	if (diffMs < 0) {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
			year: isThisYear(d, now) ? undefined : "numeric",
		}).format(d);
	}

	if (isToday(d, now)) {
		if (diffHours < 1) {
			const minutes = Math.floor(diffMs / MS_MINUTE);
			return minutes < 1 ? "Just Now" : `${minutes}m ago`;
		}
		return `${Math.floor(diffHours)}h ago`;
	}

	if (isYesterday(d, now)) {
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
		year: isThisYear(d, now) ? undefined : "numeric",
	}).format(d);
}

/**
 * Format an absolute date (e.g., for created/updated timestamps).
 * Returns MM/DD/YYYY format.
 */
export function formatAbsoluteDate(ms: number): string {
	if (!Number.isFinite(ms) || Number.isNaN(ms)) return "";
	return new Date(ms).toLocaleDateString("en-US", {
		month: "numeric",
		day: "numeric",
		year: "numeric",
	});
}
