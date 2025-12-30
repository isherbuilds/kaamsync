import type { Row } from "@rocicorp/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { CalendarIcon, ChevronDown, ListTodoIcon } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { useParams } from "react-router";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import { MatterDialog } from "~/components/matter-dialog";
import {
	MemberSelect,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter-field-selectors";
import { StableLink } from "~/components/stable-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyStateCard } from "~/components/ui/empty-state";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { VirtualizedList } from "~/components/virtualized-list";
import {
	type HeaderItem,
	type ListItem,
	type TaskItem,
	useGroupedTasks,
} from "~/hooks/use-grouped-tasks";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { usePermissions } from "~/hooks/use-permissions";
import {
	// COMPLETED_STATUS_TYPES,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
} from "~/lib/matter-constants";
import { cn, formatCompactRelativeDate } from "~/lib/utils";
import type { Route } from "./+types/$workspaceCode";

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `${params.workspaceCode} - Tasks` },
];

type Matter = Row["mattersTable"] & { status: Row["statusesTable"] };
type Status = Row["statusesTable"];

// Header and EmptyState props
type ActionProps = {
	isManager: boolean;
	canRequest: boolean;
	workspaceId: string;
	workspaceCode: string;
	taskStatuses: readonly Status[];
	requestStatuses: readonly Status[];
	members: readonly Row["workspaceMembershipsTable"][];
};

export default function WorkspaceIndex() {
	const { orgSlug } = useOrgLoaderData();
	const { workspaceCode } = useParams();
	const z = useZero();

	// 1. Data Fetching
	const [workspaces] = useQuery(queries.getWorkspacesList(), CACHE_NAV);
	const workspace = useMemo(
		() => workspaces.find((w) => w.code === workspaceCode),
		[workspaces, workspaceCode],
	);
	const workspaceId = workspace?.id ?? "";

	const [matters] = useQuery(queries.getWorkspaceMatters({ workspaceId }), {
		enabled: !!workspaceId,
		...CACHE_NAV,
	});

	const [statuses] = useQuery(queries.getWorkspaceStatuses({ workspaceId }), {
		enabled: !!workspaceId,
		...CACHE_NAV,
	});

	// 2. Logic extraction using custom hooks
	const { flatItems, activeCount, stickyIndices, toggleGroup } =
		useGroupedTasks(matters as Matter[], statuses, workspaceId);

	const { isManager, canCreateRequests } = usePermissions(
		workspaceId,
		workspace?.memberships,
	);

	const onPriority = useCallback(
		(id: string, p: PriorityValue) =>
			z.mutate(mutators.matter.update({ id, priority: p })),
		[z],
	);
	const onStatus = useCallback(
		(id: string, s: string) =>
			z.mutate(mutators.matter.updateStatus({ id, statusId: s })),
		[z],
	);
	const onAssign = useCallback(
		(id: string, u: string | null) =>
			z.mutate(mutators.matter.assign({ id, assigneeId: u })),
		[z],
	);

	// Filter statuses for task-only view (exclude request statuses)
	const taskStatuses = useMemo(
		() => statuses.filter((s) => !s.isRequestStatus),
		[statuses],
	);
	const requestStatuses = useMemo(
		() => statuses.filter((s) => s.isRequestStatus),
		[statuses],
	);

	if (!workspace) return null;

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background">
			<Header
				name={workspace.name}
				count={activeCount}
				isManager={isManager}
				canRequest={canCreateRequests}
				workspaceId={workspace.id}
				workspaceCode={workspace.code}
				taskStatuses={taskStatuses}
				requestStatuses={
					requestStatuses.length > 0 ? requestStatuses : taskStatuses
				}
				members={workspace.memberships ?? []}
			/>

			<div className="min-h-0 flex-1">
				{flatItems.length === 0 ? (
					<WorkspaceEmptyState
						isManager={isManager}
						canRequest={canCreateRequests}
						workspaceId={workspace.id}
						workspaceCode={workspace.code}
						taskStatuses={taskStatuses}
						requestStatuses={
							requestStatuses.length > 0 ? requestStatuses : taskStatuses
						}
						members={workspace.memberships ?? []}
					/>
				) : (
					<VirtualizedList
						items={flatItems}
						getItemKey={(item) => item.id}
						estimateSize={44}
						stickyIndices={stickyIndices}
						renderItem={(item: ListItem) =>
							item.type === "header" ? (
								<GroupHeader item={item} onToggle={toggleGroup} />
							) : (
								<TaskRow
									item={item}
									orgSlug={orgSlug}
									members={workspace.memberships ?? []}
									statuses={taskStatuses}
									onPriority={onPriority}
									onStatus={onStatus}
									onAssign={onAssign}
								/>
							)
						}
					/>
				)}
			</div>
		</div>
	);
}

interface HeaderProps extends ActionProps {
	name: string;
	count: number;
}

const Header = memo(
	({
		name,
		count,
		isManager,
		canRequest,
		workspaceId,
		workspaceCode,
		taskStatuses,
		requestStatuses,
		members,
	}: HeaderProps) => (
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
					<MatterDialog
						type="task"
						workspaceId={workspaceId}
						workspaceCode={workspaceCode}
						statuses={taskStatuses}
						workspaceMembers={members}
					/>
				)}
				{canRequest && (
					<MatterDialog
						type="request"
						workspaceId={workspaceId}
						workspaceCode={workspaceCode}
						statuses={requestStatuses}
						workspaceMembers={members}
					/>
				)}
			</div>
		</div>
	),
);

const GroupHeader = memo(
	({
		item,
		onToggle,
	}: {
		item: HeaderItem;
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
				className="sticky top-0 z-20 flex h-11 w-full items-center gap-2 border-b bg-background/95 px-4 backdrop-blur transition-colors hover:bg-muted/50"
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
				<span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
					{status.name}
				</span>
				<span className="ml-1 text-muted-foreground/40 text-xs tabular-nums">
					{count}
				</span>
			</button>
		);
	},
);

interface TaskRowProps {
	item: TaskItem;
	orgSlug: string;
	members: readonly Row["workspaceMembershipsTable"][];
	statuses: readonly Status[];
	onPriority: (id: string, p: PriorityValue) => void;
	onStatus: (id: string, s: string) => void;
	onAssign: (id: string, u: string | null) => void;
}

const TaskRow = memo(
	({
		item,
		orgSlug,
		members,
		statuses,
		onPriority,
		onStatus,
		onAssign,
	}: TaskRowProps) => {
		const { task, isCompleted } = item as TaskItem;
		const taskCode = `${task.workspaceCode}-${task.shortID}`;
		const link = `/${orgSlug}/matter/${taskCode}`;

		const handlePriority = useCallback(
			(p: PriorityValue) => onPriority(task.id, p),
			[onPriority, task.id],
		);

		const handleStatus = useCallback(
			(s: string) => onStatus(task.id, s),
			[onStatus, task.id],
		);

		const handleAssign = useCallback(
			(u: string | null) => onAssign(task.id, u),
			[onAssign, task.id],
		);

		return (
			<div className="group relative flex h-11 items-center border-transparent border-b transition-colors hover:border-border/50 hover:bg-muted/30">
				<StableLink to={link} className="absolute inset-0 z-10" />

				<div className="relative flex w-full items-center gap-3 px-3">
					<div className="flex shrink-0 items-center gap-3">
						<PrioritySelect
							value={task.priority as PriorityValue}
							onChange={handlePriority}
							className="z-20 p-2"
							align="start"
						/>
						<span className="hidden w-14 font-mono text-[10px] text-muted-foreground/50 md:inline">
							{taskCode}
						</span>
					</div>

					<div className="z-20 shrink-0">
						<StatusSelect
							value={task.statusId}
							statuses={statuses}
							onChange={handleStatus}
							align="start"
						/>
					</div>

					<div className="min-w-0 flex-1">
						<span
							className={cn(
								"block truncate text-[13px]",
								isCompleted && "text-muted-foreground line-through opacity-50",
							)}
						>
							{task.title}
						</span>
					</div>

					<div className="flex shrink-0 items-center gap-4">
						{task.dueDate && <DueDateBadge date={task.dueDate} />}
						<MemberSelect
							value={task.assigneeId}
							members={members}
							onChange={handleAssign}
							align="end"
							className="z-20 p-0"
						/>
					</div>
				</div>
			</div>
		);
	},
);

function DueDateBadge({ date }: { date: number }) {
	const label = formatCompactRelativeDate(date);
	const isOverdue = label === "Overdue";
	return (
		<div
			className={cn(
				"flex items-center gap-1 text-[10px]",
				isOverdue ? "text-destructive" : "text-muted-foreground/60",
			)}
		>
			<CalendarIcon className="size-3" />
			<span>{label}</span>
		</div>
	);
}

const WorkspaceEmptyState = memo(
	({
		isManager,
		canRequest,
		workspaceId,
		workspaceCode,
		taskStatuses,
		requestStatuses,
		members,
	}: ActionProps) => (
		<div className="flex h-full items-center justify-center p-8">
			<EmptyStateCard
				icon={ListTodoIcon}
				title="All clear"
				description="No active tasks in this workspace. Rest easy or create a new one."
			>
				<div className="flex gap-2">
					{isManager && (
						<MatterDialog
							type="task"
							workspaceId={workspaceId}
							workspaceCode={workspaceCode}
							statuses={taskStatuses}
							workspaceMembers={members}
						/>
					)}
					{canRequest && (
						<MatterDialog
							type="request"
							workspaceId={workspaceId}
							workspaceCode={workspaceCode}
							statuses={requestStatuses}
							workspaceMembers={members}
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
