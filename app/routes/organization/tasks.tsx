import type { QueryRowType, Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";

import { memo, useMemo } from "react";
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
import { cn } from "~/lib/utils";
import {
	CreatedDateLabel,
	DueDateLabel,
	EMPTY_STATUS,
} from "~/lib/utils/matter";
import type { Route } from "./+types/tasks";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Tasks - ${params.orgSlug}` },
	{
		name: "description",
		content: `Manage and view tasks assigned to you in organization ${params.orgSlug}.`,
	},
];

type TaskMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };
type MemberWithUser = QueryRowType<
	ReturnType<typeof queries.getOrganizationMembers>
>;

// --------------------------------------------------------------------------
// Memoized Row Component
// --------------------------------------------------------------------------

interface TaskRowProps {
	matter: TaskMatter;
	author: MemberWithUser | undefined;
	orgSlug: string;
	isMobile: boolean;
	now: number;
}

const TaskRow = memo(function TaskRow({
	matter,
	author,
	orgSlug,
	isMobile,
	now,
}: TaskRowProps) {
	const statusType = (matter.status?.type as StatusType) ?? "not_started";
	const StatusIcon = STATUS_TYPE_ICONS[statusType];
	const priority = matter.priority ?? Priority.NONE;
	const taskCode = `${matter.teamCode}-${matter.shortID}`;
	const isOverdue = matter.dueDate ? matter.dueDate < now : false;

	const linkTo = isMobile
		? `/${orgSlug}/matter/${taskCode}`
		: `/${orgSlug}/tasks/matter/${taskCode}`;

	return (
		<NavLink
			prefetch={isMobile ? "none" : "intent"}
			to={linkTo}
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
					{priority !== Priority.NONE && (
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
							`border-status-${statusType.replace("_", "-")}/30 bg-status-${statusType.replace("_", "-")}/10`,
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

			{/* Footer Row */}
			<div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
				{author?.usersTable && (
					<div className="flex items-center gap-1.5">
						<CustomAvatar name={author.usersTable.name} className="size-6" />
						<span className="max-w-24 truncate">{author.usersTable.name}</span>
					</div>
				)}
				<div className="flex gap-2">
					{matter.dueDate && (
						<DueDateLabel date={matter.dueDate} isOverdue={isOverdue} />
					)}
					<CreatedDateLabel createdAt={matter.createdAt} />
				</div>
			</div>
		</NavLink>
	);
});

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

export default function OrganizationTasksPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const isMobile = useIsMobile();

	const [tasks] = useQuery(queries.getUserAssignedMatters(), CACHE_LONG);
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);

	// O(1) member lookups
	const membersByUserId = useMemo(() => {
		const map = new Map<string, MemberWithUser>();
		if (!members) return map;
		for (const m of members) map.set(m.userId, m as MemberWithUser);
		return map;
	}, [members]);

	const now = useMemo(() => Date.now(), []);

	const tasksSortedByStatus = useMemo(() => {
		if (!tasks?.length) return [];
		return [...tasks].sort((a, b) =>
			sortStatusComparator(a.status ?? EMPTY_STATUS, b.status ?? EMPTY_STATUS),
		);
	}, [tasks]);

	const renderItem = useMemo(
		() => (matter: TaskMatter) => (
			<TaskRow
				key={matter.id}
				matter={matter}
				author={membersByUserId.get(matter.authorId)}
				orgSlug={orgSlug}
				isMobile={isMobile}
				now={now}
			/>
		),
		[membersByUserId, orgSlug, isMobile, now],
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
			renderItem={renderItem}
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
