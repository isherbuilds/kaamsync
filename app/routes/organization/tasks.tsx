import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { CheckCircle2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { renderPriorityIcon } from "~/components/icons";
import { MatterListLayout } from "~/components/matter/matter-list-layout";
import { CustomAvatar } from "~/components/ui/avatar";
import { Item, ItemContent, ItemTitle } from "~/components/ui/item";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import {
	compareStatuses,
	getPriorityColor,
	Priority,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
} from "~/lib/matter-constants";
import { cn, formatCompactRelativeDate } from "~/lib/utils";

import type { Route } from "./+types/tasks";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Tasks - ${params.orgSlug}`,
	},
	{
		name: "description",
		content: `Manage and view tasks assigned to you in organization ${params.orgSlug}.`,
	},
];

type TaskMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };

export default function TasksPage() {
	const { orgSlug } = useOrgLoaderData();
	const isMobile = useIsMobile();

	const [tasks = []] = useQuery(queries.getUserAssignedMatters(), {
		...CACHE_LONG,
	});

	const [members = []] = useQuery(queries.getOrganizationMembers(), {
		...CACHE_LONG,
	});

	const sortedTasks = useMemo(() => {
		if (!tasks) return [];
		return [...tasks]
			.filter((t) => t)
			.sort((a, b) => compareStatuses(a.status || {}, b.status || {}));
	}, [tasks]);

	const membersMap = useMemo(() => {
		const map = new Map();
		if (!members) return map;
		for (const m of members) {
			map.set(m.userId, m);
		}
		return map;
	}, [members]);

	const renderTaskItem = useCallback(
		(matter: TaskMatter) => {
			const priority = (matter.priority ?? Priority.NONE) as PriorityValue;
			const statusType = (matter.status?.type as StatusType) ?? "not_started";
			const StatusIcon = STATUS_TYPE_ICONS[statusType];
			const author = membersMap.get(matter.authorId);

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
									<div className={getPriorityColor(priority)}>
										{renderPriorityIcon(priority)}
									</div>

									{matter.dueDate && (
										<span
											className={cn(
												"text-muted-foreground text-xs",
												(matter.dueDate < Date.now() ||
													priority === Priority.URGENT) &&
													"font-medium text-priority-urgent",
											)}
										>
											{formatCompactRelativeDate(matter.dueDate)}
										</span>
									)}
								</div>
							</div>
						</ItemContent>
					</Item>
				</NavLink>
			);
		},
		[orgSlug, isMobile, membersMap],
	);

	return (
		<MatterListLayout
			title="Tasks"
			icon={CheckCircle2}
			accentColor="blue"
			items={sortedTasks}
			isLoading={!tasks}
			emptyState={{
				title: "No tasks assigned",
				description: "You're all caught up",
			}}
			estimateSize={60}
			renderItem={renderTaskItem}
		/>
	);
}
