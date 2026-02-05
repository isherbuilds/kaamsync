import type { Row } from "@rocicorp/zero";
import { useCallback, useMemo, useState } from "react";
import {
	COMPLETED_STATUS_TYPES,
	STATUS_TYPE_ORDER,
	type StatusType,
} from "~/config/matter";

type Matter = Row["mattersTable"];
type MatterWithStatus = Matter & { status: Row["statusesTable"] | null };
type Status = Row["statusesTable"];

export type StatusGroupHeader = {
	type: "header";
	id: string;
	status: Status;
	count: number;
	isExpanded: boolean;
};

export type TaskListItem = {
	type: "task";
	id: string;
	task: MatterWithStatus;
	isCompleted: boolean;
};

export type StatusGroupListItem = StatusGroupHeader | TaskListItem;

const DEFAULT_COLLAPSED_STATUS_TYPES = new Set<string>(COMPLETED_STATUS_TYPES);

/**
 * Hook to group and flatten tasks by status for virtualized lists.
 * Performs client-side join between matters and statuses for efficiency.
 * Always rebuilds groups from matters for correctness; the operation is O(n).
 */
export type UseTasksByStatusGroupResult = {
	flatItems: StatusGroupListItem[];
	activeCount: number;
	stickyIndices: number[];
	toggleGroup: (id: string) => void;
};

export function useTasksByStatusGroup(
	matters: readonly Matter[],
	statuses: readonly Status[],
): UseTasksByStatusGroupResult {
	// Tracks statuses that have been manually toggled
	const [toggledStatuses, setToggledStatuses] = useState<Set<string>>(
		new Set(),
	);

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
			return { flatItems: [], activeCount: 0, stickyIndices: [], toggleGroup };
		}

		// Build status lookup map for O(1) access
		const statusMap = new Map(statuses.map((s) => [s.id, s]));

		// Always rebuild groups from scratch for correctness and simplicity
		const groups = new Map<
			string,
			{ status: Status; tasks: MatterWithStatus[]; order: number }
		>();
		let activeCount = 0;

		// First pass: group tasks by status (client-side join)
		for (const matter of matters) {
			const status = statusMap.get(matter.statusId);
			if (!status) continue;

			let group = groups.get(status.id);
			if (!group) {
				const type = (status.type ?? "not_started") as StatusType;
				group = {
					status,
					tasks: [],
					order: STATUS_TYPE_ORDER[type] ?? 99,
				};
				groups.set(status.id, group);
			}
			group.tasks.push({ ...matter, status });

			if (!DEFAULT_COLLAPSED_STATUS_TYPES.has(status.type as string)) {
				activeCount++;
			}
		}

		// Sort groups by predefined status type order
		const sortedGroups = Array.from(groups.values()).sort(
			(a, b) => a.order - b.order,
		);

		const flatItems: StatusGroupListItem[] = [];
		const stickyIndices: number[] = [];

		// Second pass: flatten into list items
		for (const group of sortedGroups) {
			const isCompletedType = DEFAULT_COLLAPSED_STATUS_TYPES.has(
				group.status.type as string,
			);
			const isExpanded = toggledStatuses.has(group.status.id)
				? isCompletedType // Toggle from default
				: !isCompletedType; // Default expanded for active, collapsed for completed

			// Add header
			stickyIndices.push(flatItems.length);
			flatItems.push({
				type: "header",
				id: `h-${group.status.id}`,
				status: group.status,
				count: group.tasks.length,
				isExpanded,
			});

			// Add tasks if expanded
			if (isExpanded) {
				for (const task of group.tasks) {
					flatItems.push({
						type: "task",
						id: task.id,
						task,
						isCompleted: isCompletedType,
					});
				}
			}
		}

		return { flatItems, activeCount, stickyIndices };
	}, [matters, statuses, toggledStatuses, toggleGroup]);

	return {
		...result,
		toggleGroup,
	};
}
