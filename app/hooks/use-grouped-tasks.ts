import type { Row } from "@rocicorp/zero";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
 * Optimized with incremental updates and stable references.
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

	// Cache previous results for incremental updates
	const prevMattersRef = useRef<readonly Matter[]>([]);
	const prevStatusesRef = useRef<readonly Status[]>([]);
	const prevResultRef = useRef<{
		flatItems: ListItem[];
		activeCount: number;
		stickyIndices: number[];
	}>({ flatItems: [], activeCount: 0, stickyIndices: [] });

	// Reset toggles when team changes
	useEffect(() => {
		setToggledStatuses(new Set());
		prevMattersRef.current = [];
		prevStatusesRef.current = [];
	}, [teamId]);

	// Stable toggle function with useCallback
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
		// Early return for empty data
		if (!matters.length || !statuses.length) {
			const emptyResult = { flatItems: [], activeCount: 0, stickyIndices: [] };
			prevResultRef.current = emptyResult;
			return emptyResult;
		}

		// Check if we can use incremental update (only toggle state changed)
		const mattersChanged = prevMattersRef.current !== matters;
		const statusesChanged = prevStatusesRef.current !== statuses;
		
		if (!mattersChanged && !statusesChanged && prevResultRef.current.flatItems.length > 0) {
			// Only toggle state changed - rebuild with cached groups
			const cachedResult = rebuildWithToggles(prevResultRef.current, toggledStatuses);
			return cachedResult;
		}

		// Full rebuild needed
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

		const newResult = { flatItems, activeCount, stickyIndices };
		
		// Cache for next render
		prevMattersRef.current = matters;
		prevStatusesRef.current = statuses;
		prevResultRef.current = newResult;

		return newResult;
	}, [matters, statuses, toggledStatuses]);

	return {
		...result,
		toggleGroup,
	};
}

/**
 * Rebuild list items with new toggle state (optimization for toggle-only changes)
 */
function rebuildWithToggles(
	prevResult: { flatItems: ListItem[]; activeCount: number; stickyIndices: number[] },
	toggledStatuses: Set<string>
): { flatItems: ListItem[]; activeCount: number; stickyIndices: number[] } {
	const flatItems: ListItem[] = [];
	const stickyIndices: number[] = [];
	let activeCount = prevResult.activeCount;

	let i = 0;
	while (i < prevResult.flatItems.length) {
		const item = prevResult.flatItems[i];
		
		if (item.type === "header") {
			const isCompletedType = COLLAPSED_TYPES.has(item.status.type as string);
			const isExpanded = toggledStatuses.has(item.status.id)
				? isCompletedType
				: !isCompletedType;

			// Add header with updated expansion state
			stickyIndices.push(flatItems.length);
			flatItems.push({
				...item,
				isExpanded,
			});

			// Skip or include tasks based on expansion
			i++; // Move past header
			if (isExpanded) {
				// Include tasks
				while (i < prevResult.flatItems.length && prevResult.flatItems[i].type === "task") {
					flatItems.push(prevResult.flatItems[i]);
					i++;
				}
			} else {
				// Skip tasks
				while (i < prevResult.flatItems.length && prevResult.flatItems[i].type === "task") {
					i++;
				}
			}
		} else {
			i++;
		}
	}

	return { flatItems, activeCount, stickyIndices };
}
