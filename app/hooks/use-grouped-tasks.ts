import type { Row } from "@rocicorp/zero";
import { useCallback, useMemo, useRef, useState } from "react";
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
 * Optimized hook to group and flatten tasks by status for virtualized lists.
 * Uses incremental updates instead of full rebuilds for better performance.
 */
export type UseGroupedTasksResult = {
	flatItems: ListItem[];
	activeCount: number;
	stickyIndices: number[];
	toggleGroup: (id: string) => void;
};

interface GroupState {
	groups: Map<string, { status: Status; tasks: Matter[]; order: number }>;
	activeCount: number;
	flatItems: ListItem[];
	stickyIndices: number[];
}

export function useGroupedTasks(
	matters: readonly Matter[],
	statuses: readonly Status[],
): UseGroupedTasksResult {
	// Tracks statuses that have been manually toggled
	const [toggledStatuses, setToggledStatuses] = useState<Set<string>>(
		new Set(),
	);

	// Cache previous state to detect changes
	const prevStateRef = useRef<GroupState>({
		groups: new Map(),
		activeCount: 0,
		flatItems: [],
		stickyIndices: [],
	});

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
			prevStateRef.current = {
				groups: new Map(),
				activeCount: 0,
				flatItems: [],
				stickyIndices: [],
			};
			return { flatItems: [], activeCount: 0, stickyIndices: [] };
		}

		// Check if we can do incremental update
		const prevGroups = prevStateRef.current.groups;
		const shouldRebuild =
			!prevGroups.size ||
			matters.length !==
				prevStateRef.current.flatItems.filter((item) => item.type === "task")
					.length ||
			statuses.length !== prevGroups.size;

		let groups: Map<string, { status: Status; tasks: Matter[]; order: number }>;
		let activeCount: number;

		if (shouldRebuild) {
			// Full rebuild
			groups = new Map();
			activeCount = 0;

			// First pass: group tasks by status
			for (const matter of matters) {
				const status = matter.status;
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
				group.tasks.push(matter);

				if (!COLLAPSED_TYPES.has(status.type as string)) {
					activeCount++;
				}
			}
		} else {
			// Incremental update - just update task assignments
			groups = new Map(prevGroups);
			activeCount = prevStateRef.current.activeCount;

			// Create a map of current matters by status for quick lookup
			const mattersByStatus = new Map<string, Matter[]>();
			for (const matter of matters) {
				const statusId = matter.status?.id;
				if (!statusId) continue;

				if (!mattersByStatus.has(statusId)) {
					mattersByStatus.set(statusId, []);
				}
				mattersByStatus.get(statusId)!.push(matter);
			}

			// Update groups with new task lists
			for (const [statusId, group] of groups) {
				const newTasks = mattersByStatus.get(statusId) || [];
				group.tasks = newTasks;
			}
		}

		// Sort groups by predefined status type order
		const sortedGroups = Array.from(groups.values()).sort(
			(a, b) => a.order - b.order,
		);

		const flatItems: ListItem[] = [];
		const stickyIndices: number[] = [];

		// Second pass: flatten into list items
		for (const group of sortedGroups) {
			const isCompletedType = COLLAPSED_TYPES.has(group.status.type as string);
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

		// Update cache
		const newState: GroupState = {
			groups,
			activeCount,
			flatItems,
			stickyIndices,
		};
		prevStateRef.current = newState;

		return { flatItems, activeCount, stickyIndices };
	}, [matters, statuses, toggledStatuses]);

	return {
		...result,
		toggleGroup,
	};
}
