import type { Row } from "@rocicorp/zero";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Clock from "lucide-react/dist/esm/icons/clock";
import { memo, useMemo } from "react";
import { cn, formatDueDateLabel } from ".";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Stable empty object for status comparisons to avoid allocations */
export const EMPTY_STATUS = {} as Row["statusesTable"];

// ============================================================================
// MEMOIZED UI COMPONENTS
// ============================================================================

/** Memoized due date label - prevents recalculation on re-renders */
export const DueDateLabel = memo(function DueDateLabel({
	date,
	isOverdue,
}: {
	date: number;
	isOverdue: boolean;
}) {
	const label = formatDueDateLabel(date);
	return (
		<div
			className={cn(
				"flex items-center gap-1",
				isOverdue && "text-priority-urgent",
			)}
		>
			<CalendarIcon className="size-3.5" />
			<span>{label}</span>
		</div>
	);
});

function formatShortDate(ts: string | number): string {
	return new Date(ts).toLocaleDateString("en-IN", {
		month: "short",
		day: "numeric",
	});
}

export const CreatedDateLabel = memo(function CreatedDateLabel({
	createdAt,
}: {
	createdAt: string | number | null | undefined;
}) {
	const label = useMemo(() => {
		if (!createdAt) return null;
		return formatShortDate(createdAt);
	}, [createdAt]);

	if (!label) return null;

	return (
		<div className="flex items-center gap-1 text-muted-foreground text-xs">
			<Clock className="size-3.5" />
			<span>{label}</span>
		</div>
	);
});
