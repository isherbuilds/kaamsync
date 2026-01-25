import type { Row } from "@rocicorp/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { CalendarIcon, ChevronDown, ListTodoIcon } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { useParams } from "react-router";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import { CreateMatterDialog } from "~/components/matter/matter-dialog";
import {
	MemberSelect,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter/matter-field-selectors";
import { StableLink } from "~/components/shared/stable-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyStateCard } from "~/components/ui/empty-state";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { VirtualizedList } from "~/components/shared/virtualized-list";
import {
	type StatusGroupHeader,
	type StatusGroupListItem,
	type TaskListItem,
	useTasksByStatusGroup,
} from "~/hooks/use-grouped-tasks";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { usePermissions } from "~/hooks/use-permissions";
import {
	// COMPLETED_STATUS_TYPES,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
} from "~/config/matter";
import { cn, formatDueDateLabel } from "~/lib/utils";
import type { Route } from "./+types/$teamCode";

// ============================================================================
// Route Meta
// ============================================================================

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `${params.teamCode} - Tasks` },
];

// ============================================================================
// Types
// ============================================================================

type Matter = Row["mattersTable"] & { status: Row["statusesTable"] };
type Status = Row["statusesTable"];

type TeamActionProps = {
	isManager: boolean;
	canRequest: boolean;
	teamId: string;
	teamCode: string;
	taskStatuses: readonly Status[];
	requestStatuses: readonly Status[];
	members: readonly Row["teamMembershipsTable"][];
};

// ============================================================================
// Main Component
// ============================================================================

export default function TeamTasksPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const { teamCode } = useParams();
	const z = useZero();

	// 1. Data Fetching
	const [teams] = useQuery(queries.getTeamsList(), CACHE_NAV);
	const team = useMemo(
		() => teams.find((w) => w.code === teamCode),
		[teams, teamCode],
	);
	const teamId = team?.id ?? "";

	const [matters] = useQuery(queries.getTeamMatters({ teamId }), {
		enabled: !!teamId,
		...CACHE_NAV,
	});

	const [statuses] = useQuery(queries.getTeamStatuses({ teamId }), {
		enabled: !!teamId,
		...CACHE_NAV,
	});

	// 2. Logic extraction using custom hooks
	const { flatItems, activeCount, stickyIndices, toggleGroup } =
		useTasksByStatusGroup(matters as Matter[], statuses);

	const { isManager, canCreateRequests } = usePermissions(
		teamId,
		team?.memberships,
	);

	const handlePriorityChange = useCallback(
		(id: string, priority: PriorityValue) =>
			z.mutate(mutators.matter.update({ id, priority })),
		[z],
	);

	const handleStatusChange = useCallback(
		(id: string, statusId: string) =>
			z.mutate(mutators.matter.updateStatus({ id, statusId })),
		[z],
	);

	const handleAssigneeChange = useCallback(
		(id: string, assigneeId: string | null, taskTitle?: string, taskCode?: string) => {
			z.mutate(mutators.matter.assign({ id, assigneeId })).server.then(
				() => {
					if (assigneeId) {
						const notificationUrl = taskCode
							? `/${orgSlug}/matter/${taskCode}`
							: `/${orgSlug}/matter`;

						import("~/hooks/use-push-notifications")
							.then(({ sendNotificationToUser }) => {
								sendNotificationToUser(
									assigneeId,
									"Task Assigned to You",
									taskTitle
										? `${taskCode}: ${taskTitle}`
										: "A task was assigned to you",
									notificationUrl,
								);
							})
							.catch((err) => {
								console.error(
									"[PushNotification] Failed to send notification:",
									err,
								);
							});
					}
				},
			);
		},
		[z, orgSlug],
	);

	// Filter statuses for task-only view (exclude request statuses)
	const taskStatuses = useMemo(
		() =>
			statuses.filter(
				(s) => s.type !== "pending_approval" && s.type !== "rejected",
			),
		[statuses],
	);
	const requestStatuses = useMemo(
		() =>
			statuses.filter(
				(s) => s.type === "pending_approval" || s.type === "rejected",
			),
		[statuses],
	);

	if (!team) return null;

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background">
			<TeamPageHeader
				name={team.name}
				count={activeCount}
				isManager={isManager}
				canRequest={canCreateRequests}
				teamId={team.id}
				teamCode={team.code}
				taskStatuses={taskStatuses}
				requestStatuses={
					requestStatuses.length > 0 ? requestStatuses : taskStatuses
				}
				members={team.memberships ?? []}
			/>

			<div className="min-h-0 flex-1">
				{flatItems.length === 0 ? (
					<TeamTasksEmptyState
						isManager={isManager}
						canRequest={canCreateRequests}
						teamId={team.id}
						teamCode={team.code}
						taskStatuses={taskStatuses}
						requestStatuses={
							requestStatuses.length > 0 ? requestStatuses : taskStatuses
						}
						members={team.memberships ?? []}
					/>
				) : (
					<VirtualizedList
						items={flatItems}
						getItemKey={(item) => item.id}
						estimateSize={44}
						stickyIndices={stickyIndices}
						renderItem={(item: StatusGroupListItem) =>
							item.type === "header" ? (
								<StatusGroupHeader item={item} onToggle={toggleGroup} />
							) : (
								<TaskListRow
									item={item}
									orgSlug={orgSlug}
									members={team.memberships ?? []}
									statuses={taskStatuses}
									onPriorityChange={handlePriorityChange}
									onStatusChange={handleStatusChange}
									onAssigneeChange={handleAssigneeChange}
								/>
							)
						}
					/>
				)}
			</div>
		</div>
	);
}

// ============================================================================
// Header Component
// ============================================================================

interface TeamPageHeaderProps extends TeamActionProps {
	name: string;
	count: number;
}

const TeamPageHeader = memo(
	({
		name,
		count,
		isManager,
		canRequest,
		teamId,
		teamCode,
		taskStatuses,
		requestStatuses,
		members,
	}: TeamPageHeaderProps) => (
		<div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
			<div className="flex min-w-0 items-center gap-2">
				<SidebarTrigger className="-ml-1 lg:hidden" />
				<h1 className="truncate font-semibold text-sm">{name}</h1>
				<Badge
					variant="secondary"
					className="h-4 px-1.5 py-0 text-[10px] tabular-nums"
				>
					{count}
				</Badge>
			</div>
			<div className="flex items-center gap-2">
				{isManager && (
					<CreateMatterDialog
						type="task"
						teamId={teamId}
						teamCode={teamCode}
						statuses={taskStatuses}
						teamMembers={members}
					/>
				)}
				{canRequest && (
					<CreateMatterDialog
						type="request"
						teamId={teamId}
						teamCode={teamCode}
						statuses={requestStatuses}
						teamMembers={members}
					/>
				)}
			</div>
		</div>
	),
);

// ============================================================================
// Status Group Header Component
// ============================================================================

const StatusGroupHeader = memo(
	({
		item,
		onToggle,
	}: {
		item: StatusGroupHeader;
		onToggle: (id: string) => void;
	}) => {
		const { status, count, isExpanded } = item;
		const Icon =
			STATUS_TYPE_ICONS[status.type as StatusType] ||
			STATUS_TYPE_ICONS.not_started;

		return (
			<button
				type="button"
				onClick={() => onToggle(status.id)}
				className="sticky top-0 z-20 flex h-11 w-full items-center gap-2 border-b bg-background px-4 transition-colors hover:bg-muted"
			>
				<ChevronDown
					className={cn(
						"size-3.5 text-muted-foreground transition-transform",
						!isExpanded && "-rotate-90",
					)}
				/>
				<Icon
					className={cn(
						"size-4",
						STATUS_TYPE_COLORS[status.type as StatusType],
					)}
				/>
				<span className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
					{status.name}
				</span>
				<span className="ml-1 text-muted-foreground/40 text-xs tabular-nums">
					{count}
				</span>
			</button>
		);
	},
);

// ============================================================================
// Task List Row Component
// ============================================================================

interface TaskListRowProps {
	item: TaskListItem;
	orgSlug: string;
	members: readonly Row["teamMembershipsTable"][];
	statuses: readonly Status[];
	onPriorityChange: (id: string, priority: PriorityValue) => void;
	onStatusChange: (id: string, statusId: string) => void;
	onAssigneeChange: (
		id: string,
		assigneeId: string | null,
		taskTitle?: string,
		taskCode?: string,
	) => void;
}

const TaskListRow = memo(
	({
		item,
		orgSlug,
		members,
		statuses,
		onPriorityChange,
		onStatusChange,
		onAssigneeChange,
	}: TaskListRowProps) => {
		const { task, isCompleted } = item as TaskListItem;
		const taskCode = `${task.teamCode}-${task.shortID}`;
		const link = `/${orgSlug}/matter/${taskCode}`;

		const handlePrioritySelect = useCallback(
			(priority: PriorityValue) => onPriorityChange(task.id, priority),
			[onPriorityChange, task.id],
		);

		const handleStatusSelect = useCallback(
			(statusId: string) => onStatusChange(task.id, statusId),
			[onStatusChange, task.id],
		);

		const handleAssigneeSelect = useCallback(
			(assigneeId: string | null) => onAssigneeChange(task.id, assigneeId, task.title, taskCode),
			[onAssigneeChange, task.id, task.title, taskCode],
		);

		return (
			<div className="group relative flex h-11 items-center border-transparent border-b transition-colors hover:border-border/50 hover:bg-muted/30">
				<StableLink to={link} className="absolute inset-0 z-10" />

				<div className="relative flex w-full items-center gap-3 px-3">
					<div className="flex shrink-0 items-center gap-3">
						<PrioritySelect
							value={task.priority as PriorityValue}
							onChange={handlePrioritySelect}
							className="z-20 p-2"
							align="start"
						/>
						<span className="hidden w-14 font-mono text-muted-foreground/40 text-xs md:inline">
							{taskCode}
						</span>
					</div>

					<div className="z-20 shrink-0">
						<StatusSelect
							value={task.statusId}
							statuses={statuses}
							onChange={handleStatusSelect}
							align="start"
						/>
					</div>

					<div className="min-w-0 flex-1">
						<span
							className={cn(
								"block truncate text-sm",
								isCompleted && "text-muted-foreground line-through opacity-50",
							)}
						>
							{task.title}
						</span>
					</div>

					<div className="flex shrink-0 items-center gap-4">
						{task.dueDate && <TaskDueDateBadge date={task.dueDate} />}
						<MemberSelect
							value={task.assigneeId}
							members={members}
							onChange={handleAssigneeSelect}
							align="end"
							className="z-20 p-0"
						/>
					</div>
				</div>
			</div>
		);
	},
);

// ============================================================================
// Due Date Badge Component
// ============================================================================

function TaskDueDateBadge({ date }: { date: number }) {
	const label = formatDueDateLabel(date);
	const isOverdue = label === "Overdue";
	return (
		<div
			className={cn(
				"flex items-center gap-1 text-xs",
				isOverdue ? "text-priority-urgent" : "text-muted-foreground/60",
			)}
		>
			<CalendarIcon className="size-3" />
			<span>{label}</span>
		</div>
	);
}

// ============================================================================
// Empty State Component
// ============================================================================

const TeamTasksEmptyState = memo(
	({
		isManager,
		canRequest,
		teamId,
		teamCode,
		taskStatuses,
		requestStatuses,
		members,
	}: TeamActionProps) => (
		<div className="flex h-full items-center justify-center p-8">
			<EmptyStateCard
				icon={ListTodoIcon}
				title="All clear"
				description="No active tasks in this team. Rest easy or create a new one."
			>
				<div className="flex gap-2">
					{isManager && (
						<CreateMatterDialog
							type="task"
							teamId={teamId}
							teamCode={teamCode}
							statuses={taskStatuses}
							teamMembers={members}
						/>
					)}
					{canRequest && (
						<CreateMatterDialog
							type="request"
							teamId={teamId}
							teamCode={teamCode}
							statuses={requestStatuses}
							teamMembers={members}
							triggerButton={
								<Button size="sm" variant="outline">
									Request
								</Button>
							}
						/>
					)}
				</div>
			</EmptyStateCard>
		</div>
	),
);
