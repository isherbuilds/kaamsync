import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { MatterListWithDetailPanel } from "~/components/matter/matter-list-layout";
import { renderPriorityIcon } from "~/components/shared/icons";
import { CustomAvatar } from "~/components/ui/avatar";
import { Item, ItemContent, ItemTitle } from "~/components/ui/item";
import {
	getPriorityColorClass,
	Priority,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
	sortStatusComparator,
} from "~/config/matter";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn, formatDueDateLabel } from "~/lib/utils";

import type { Route } from "./+types/tasks";

// ============================================================================
// Meta
// ============================================================================

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Tasks - ${params.orgSlug}`,
	},
	{
		name: "description",
		content: `Manage and view tasks assigned to you in organization ${params.orgSlug}.`,
	},
];

// ============================================================================
// Types
// ============================================================================

type TaskMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };

// ============================================================================
// Component
// ============================================================================

export default function OrganizationTasksPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const isMobile = useIsMobile();

	// --------------------------------------------------------------------------
	// Data Fetching
	// --------------------------------------------------------------------------

	const [tasks] = useQuery(queries.getUserAssignedMatters(), {
		...CACHE_LONG,
	});

	const [members] = useQuery(queries.getOrganizationMembers(), {
		...CACHE_LONG,
	});

	// --------------------------------------------------------------------------
	// Memoized Values
	// --------------------------------------------------------------------------

	const tasksSortedByStatus = useMemo(() => {
		if (!tasks?.length) return [];
		return [...tasks].sort((a, b) =>
			sortStatusComparator(a.status || {}, b.status || {}),
		);
	}, [tasks]);

	const membersByUserId = useMemo(() => {
		const map = new Map();
		if (!members) return map;
		for (const m of members) {
			map.set(m.userId, m);
		}
		return map;
	}, [members]);

	// --------------------------------------------------------------------------
	// Callbacks
	// --------------------------------------------------------------------------

	const now = useMemo(() => Date.now(), []);

	const handleRenderTaskItem = useCallback(
		(matter: TaskMatter) => {
			const priority = (matter.priority ?? Priority.NONE) as PriorityValue;
			const statusType = (matter.status?.type as StatusType) ?? "not_started";
			const StatusIcon = STATUS_TYPE_ICONS[statusType];
			const author = membersByUserId.get(matter.authorId);

			return (
				<NavLink
					key={matter.id}
					prefetch="intent"
					to={`/${orgSlug}/${isMobile ? "" : "tasks/"}matter/${matter.teamCode}-${matter.shortID}`}
					className={({ isActive }: { isActive: boolean }) =>
						cn(
							"group relative block rounded transition-all duration-200",
							isActive ? "bg-brand-tasks/5" : "hover:bg-muted/50",
						)
					}
				>
					<Item className="p-3">
						<ItemContent className="flex-row items-start gap-3">
							<CustomAvatar name={author?.usersTable?.name} />

							<ItemTitle className="line-clamp-2 min-w-0 flex-1 font-normal text-foreground text-sm">
								{matter.teamCode}-{matter.shortID} {matter.title}
							</ItemTitle>

							<div className="flex shrink-0 flex-col items-end gap-1">
								{matter.status && (
									<StatusIcon className={STATUS_TYPE_COLORS[statusType]} />
								)}

								<div className="flex items-center gap-1">
									<div className={getPriorityColorClass(priority)}>
										{renderPriorityIcon(priority)}
									</div>

									{matter.dueDate && (
										<span
											className={cn(
												"text-muted-foreground text-xs",
												(matter.dueDate < now ||
													priority === Priority.URGENT) &&
													"font-medium text-priority-urgent",
											)}
										>
											{formatDueDateLabel(matter.dueDate)}
										</span>
									)}
								</div>
							</div>
						</ItemContent>
					</Item>
				</NavLink>
			);
		},
		[membersByUserId, orgSlug, isMobile, now],
	);

	// --------------------------------------------------------------------------
	// Render
	// --------------------------------------------------------------------------

	return (
		<MatterListWithDetailPanel
			title="Tasks"
			icon={CheckCircle2}
			accentColor="blue"
			items={tasksSortedByStatus}
			isLoading={!tasks}
			emptyState={{
				title: "No tasks assigned",
				description: "You're all caught up",
			}}
			estimateSize={60}
			renderItem={handleRenderTaskItem}
		/>
	);
}
