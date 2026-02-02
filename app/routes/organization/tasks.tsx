import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Clock from "lucide-react/dist/esm/icons/clock";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { MatterListWithDetailPanel } from "~/components/matter/matter-list-layout";
import { RouteErrorBoundary } from "~/components/shared/error-boundary";
import { CustomAvatar } from "~/components/ui/avatar";
import {
	getPriorityBadgeClass,
	getPriorityDisplayLabel,
	Priority,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
	sortStatusComparator,
} from "~/config/matter";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn, formatDueDateLabel } from "~/lib/utils";

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

export default function OrganizationTasksPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const isMobile = useIsMobile();

	const [tasks] = useQuery(queries.getUserAssignedMatters(), {
		...CACHE_LONG,
	});

	const [members] = useQuery(queries.getOrganizationMembers(), {
		...CACHE_LONG,
	});

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

	const handleRenderTaskItem = useCallback(
		(matter: TaskMatter) => {
			const now = Date.now();
			const statusType = (matter.status?.type as StatusType) ?? "not_started";
			const StatusIcon = STATUS_TYPE_ICONS[statusType];
			const author = membersByUserId.get(matter.authorId);
			const priority = matter.priority ?? Priority.NONE;
			const taskCode = `${matter.teamCode}-${matter.shortID}`;
			const isOverdue = matter.dueDate && matter.dueDate < now;
			const createdDate = matter.createdAt
				? new Date(matter.createdAt).toLocaleDateString("en-IN", {
						month: "short",
						day: "numeric",
					})
				: null;

			return (
				<NavLink
					key={matter.id}
					prefetch="intent"
					to={
						isMobile
							? `/${orgSlug}/matter/${taskCode}`
							: `/${orgSlug}/tasks/matter/${taskCode}`
					}
					className={({ isActive }: { isActive: boolean }) =>
						cn(
							"group my-0.5 block rounded-lg border p-4 transition-colors duration-200",
							isActive
								? "border-brand-tasks/40 bg-brand-tasks/5"
								: "border-border bg-background/30 hover:border-brand-tasks/20 hover:bg-brand-tasks/5",
						)
					}
				>
					{/* Header Row: ID, Status, Priority */}
					<div className="mb-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="font-mono text-muted-foreground text-xs">
								{taskCode}
							</span>
							{matter.priority != null && matter.priority !== Priority.NONE && (
								<span
									className={cn(
										"inline-flex items-center rounded px-2 py-0.5 font-semibold text-xs uppercase tracking-wider",
										getPriorityBadgeClass(priority),
									)}
								>
									{getPriorityDisplayLabel(priority)}
								</span>
							)}
						</div>
						{matter.status && (
							<span
								className={cn(
									"inline-flex items-center gap-1 rounded border px-2 py-0.5 font-medium text-xs uppercase tracking-wider",
									STATUS_TYPE_COLORS[statusType],
									statusType === "not_started" &&
										"border-status-not-started/30 bg-status-not-started/10 text-status-not-started",
									statusType === "started" &&
										"border-status-started/30 bg-status-started/10 text-status-started",
									statusType === "completed" &&
										"border-status-completed/30 bg-status-completed/10 text-status-completed",
								)}
							>
								<StatusIcon className="size-3" />
								{matter.status.name}
							</span>
						)}
					</div>

					{/* Title */}
					<h3 className="mb-3 line-clamp-2 font-medium text-sm leading-relaxed">
						{matter.title}
					</h3>

					{/* Footer Row: Author, Due Date, Created */}
					<div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
						{author && (
							<div className="flex items-center gap-1.5">
								<CustomAvatar
									name={author.usersTable?.name}
									className="size-6"
								/>
								<span className="max-w-24 truncate">
									{author.usersTable?.name}
								</span>
							</div>
						)}

						<div className="flex gap-2">
							{matter.dueDate && (
								<div
									className={cn(
										"flex items-center gap-1",
										isOverdue && "text-priority-urgent",
									)}
								>
									<CalendarIcon className="size-3.5" />
									<span>{formatDueDateLabel(matter.dueDate)}</span>
								</div>
							)}
							{createdDate && (
								<div className="flex items-center gap-1">
									<Clock className="size-3.5" />
									<span>{createdDate}</span>
								</div>
							)}
						</div>
					</div>
				</NavLink>
			);
		},
		[orgSlug, isMobile, membersByUserId],
	);

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
			estimateSize={140}
			renderItem={handleRenderTaskItem}
		/>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary
			title="Tasks Error"
			description="Failed to load tasks"
		/>
	);
}
