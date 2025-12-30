import type { Row } from "@rocicorp/zero";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	COMPLETED_STATUS_TYPES,
	STATUS_TYPE_ORDER,
	type StatusType,
} from "~/lib/matter-constants";

type Matter = Row["mattersTable"] & { status: Row["statusesTable"] };
type Status = Row["statusesTable"];

export type HeaderItem = {
	type: "header";
	id: string;
	status: Status;
	count: number;
	isExpanded: boolean;
};

export type TaskItem = {
	type: "task";
	id: string;
	task: Matter;
	isCompleted: boolean;
};

export type ListItem = HeaderItem | TaskItem;

const COLLAPSED_TYPES = new Set<string>(COMPLETED_STATUS_TYPES);

/**
 * Hook to group and flatten tasks by status for virtualized lists.
 * Handles expanded/collapsed state and provides optimized memoized results.
 */
export function useGroupedTasks(
	matters: readonly Matter[],
	statuses: readonly Status[],
	teamId: string,
) {
	// Tracks statuses that have been manually toggled
	const [toggledStatuses, setToggledStatuses] = useState<Set<string>>(
		new Set(),
	);

	// Reset toggles when team changes
	useEffect(() => {
		setToggledStatuses(new Set());
	}, [teamId]);

	const toggleGroup = useCallback((id: string) => {
		setToggledStatuses((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const result = useMemo(() => {
		if (!matters.length || !statuses.length) {
			return { flatItems: [], activeCount: 0, stickyIndices: [] };
		}

		const groups = new Map<
			string,
			{ status: Status; tasks: Matter[]; order: number }
		>();
		let activeCount = 0;

		// First pass: group tasks by status
		for (const m of matters) {
			const s = m.status;
			if (!s) continue;

			let g = groups.get(s.id);
			if (!g) {
				const type = (s.type ?? "not_started") as StatusType;
				g = {
					status: s,
					tasks: [],
					order: STATUS_TYPE_ORDER[type] ?? 99,
				};
				groups.set(s.id, g);
			}
			g.tasks.push(m);

			if (!COLLAPSED_TYPES.has(s.type as string)) {
				activeCount++;
			}
		}

		// Sort groups by predefined status type order
		const sortedGroups = Array.from(groups.values()).sort(
			(a, b) => a.order - b.order,
		);

		const flatItems: ListItem[] = [];
		const stickyIndices: number[] = [];

		// Second pass: flatten into list items
		for (const g of sortedGroups) {
			const isCompletedType = COLLAPSED_TYPES.has(g.status.type as string);
			const isExpanded = toggledStatuses.has(g.status.id)
				? isCompletedType // Toggle from default
				: !isCompletedType; // Default expanded for active, collapsed for completed

			// Add header
			stickyIndices.push(flatItems.length);
			flatItems.push({
				type: "header",
				id: `h-${g.status.id}`,
				status: g.status,
				count: g.tasks.length,
				isExpanded,
			});

			// Add tasks if expanded
			if (isExpanded) {
				for (const t of g.tasks) {
					flatItems.push({
						type: "task",
						id: t.id,
						task: t,
						isCompleted: isCompletedType,
					});
				}
			}
		}

		return { flatItems, activeCount, stickyIndices };
	}, [matters, statuses, toggledStatuses]);

	return {
		...result,
		toggleGroup,
	};
}
