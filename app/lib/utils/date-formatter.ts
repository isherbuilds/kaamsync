/**
 * Consolidated date formatting utilities.
 * Replaces multiple scattered date formatting functions with a single, consistent API.
 */

import { formatDistanceToNow, format, isToday, isYesterday, isThisYear } from "date-fns";

export class DateFormatter {
	/**
	 * Format date for timeline entries (e.g., "2 hours ago", "Yesterday at 3:30 PM")
	 */
	static formatTimeline(date: Date | string | number): string {
		const d = new Date(date);
		
		if (isToday(d)) {
			return formatDistanceToNow(d, { addSuffix: true });
		}
		
		if (isYesterday(d)) {
			return `Yesterday at ${format(d, "h:mm a")}`;
		}
		
		if (isThisYear(d)) {
			return format(d, "MMM d 'at' h:mm a");
		}
		
		return format(d, "MMM d, yyyy 'at' h:mm a");
	}

	/**
	 * Format date for compact display in lists (e.g., "2h", "3d", "Jan 15")
	 */
	static formatCompact(date: Date | string | number): string {
		const d = new Date(date);
		const now = new Date();
		const diffInHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60));
		
		if (diffInHours < 1) {
			const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));
			return diffInMinutes < 1 ? "now" : `${diffInMinutes}m`;
		}
		
		if (diffInHours < 24) {
			return `${diffInHours}h`;
		}
		
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) {
			return `${diffInDays}d`;
		}
		
		if (isThisYear(d)) {
			return format(d, "MMM d");
		}
		
		return format(d, "MMM d, yy");
	}

	/**
	 * Format date for relative display (e.g., "2 hours ago", "in 3 days")
	 */
	static formatRelative(date: Date | string | number): string {
		const d = new Date(date);
		return formatDistanceToNow(d, { addSuffix: true });
	}

	/**
	 * Format date for due dates with urgency indicators
	 */
	static formatDueDate(date: Date | string | number): { 
		text: string; 
		urgency: "overdue" | "today" | "tomorrow" | "this-week" | "later" 
	} {
		const d = new Date(date);
		const now = new Date();
		const diffInDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		
		if (diffInDays < 0) {
			return {
				text: `Overdue by ${Math.abs(diffInDays)} day${Math.abs(diffInDays) === 1 ? "" : "s"}`,
				urgency: "overdue"
			};
		}
		
		if (diffInDays === 0) {
			return { text: "Due today", urgency: "today" };
		}
		
		if (diffInDays === 1) {
			return { text: "Due tomorrow", urgency: "tomorrow" };
		}
		
		if (diffInDays <= 7) {
			return { 
				text: `Due in ${diffInDays} days`, 
				urgency: "this-week" 
			};
		}
		
		return { 
			text: `Due ${format(d, "MMM d")}`, 
			urgency: "later" 
		};
	}

	/**
	 * Format date for full display (e.g., "January 15, 2024 at 3:30 PM")
	 */
	static formatFull(date: Date | string | number): string {
		const d = new Date(date);
		return format(d, "MMMM d, yyyy 'at' h:mm a");
	}

	/**
	 * Format date for input fields (ISO date string)
	 */
	static formatForInput(date: Date | string | number): string {
		const d = new Date(date);
		return format(d, "yyyy-MM-dd");
	}

	/**
	 * Format datetime for input fields (ISO datetime-local string)
	 */
	static formatForDateTimeInput(date: Date | string | number): string {
		const d = new Date(date);
		return format(d, "yyyy-MM-dd'T'HH:mm");
	}

	/**
	 * Check if a date is in the past
	 */
	static isPast(date: Date | string | number): boolean {
		return new Date(date) < new Date();
	}

	/**
	 * Check if a date is within the next N days
	 */
	static isWithinDays(date: Date | string | number, days: number): boolean {
		const d = new Date(date);
		const future = new Date();
		future.setDate(future.getDate() + days);
		return d <= future;
	}
}