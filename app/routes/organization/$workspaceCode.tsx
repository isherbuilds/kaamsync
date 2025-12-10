import { useQuery } from "@rocicorp/zero/react";
import {
	CalendarIcon,
	ChevronDown,
	ListTodoIcon,
	MessageSquareIcon,
	PlusIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { queries } from "zero/queries";
import { CACHE_NAV, CACHE_STATIC } from "zero/query-cache-policy";
import { CreateRequestDialog } from "~/components/create-request-dialog";
import { CreateTaskDialog } from "~/components/create-task-dialog";
import {
	AssigneeSelect,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter-field-selectors";
import { StableLink } from "~/components/stable-link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { EmptyStateCard } from "~/components/ui/empty-state";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { VirtualizedList } from "~/components/virtualized-list";
import type { workspaceRole } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { useCachedQuery } from "~/hooks/use-stable-query";
import { useZ } from "~/hooks/use-zero-cache";
import {
	COMPLETED_STATUS_TYPES,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	STATUS_TYPE_ORDER,
	type StatusType,
} from "~/lib/matter-constants";
import { cn, formatCompactRelativeDate } from "~/lib/utils";

// Status types that should be collapsed by default
const COLLAPSED_STATUS_TYPES = new Set<StatusType>(COMPLETED_STATUS_TYPES);

// Item types for the flat virtual list
type HeaderItem = {
	type: "header";
	id: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	status: any;
	count: number;
	isCompleted: boolean;
	isExpanded: boolean;
};

type TaskItem = {
	type: "task";
	id: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	task: any;
	isCompleted: boolean;
};

type ListItem = HeaderItem | TaskItem;

// Pre-grouped data structure to avoid recalculation
type StatusGroup = {
	statusId: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	status: any;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	tasks: any[];
	isCompleted: boolean;
	order: number;
};

export default function WorkspaceIndex() {
	const { orgSlug, queryCtx, authSession } = useOrgLoaderData();
	const params = useParams();
	const z = useZ();

	const { workspaceCode } = params;

	// Workspace list query
	const [workspacesData] = useQuery(
		queries.getWorkspacesList(queryCtx),
		CACHE_NAV,
	);

	// Find workspace - simple find, no memoization needed for small arrays
	const workspace = workspacesData.find((w) => w.code === workspaceCode);
	const workspaceId = workspace?.id ?? "";

	// Get matters - Use workspace ID directly
	// TODO: Analyze if useCachedQuery is beneficial here
	const [allMatters] = useQuery(
		queries.getWorkspaceMatters(queryCtx, workspaceId),
		{ enabled: Boolean(workspaceId), ...CACHE_NAV },
	);

	// Get members (cached longer)
	const [members] = useQuery(queries.getOrganizationMembers(queryCtx), {
		enabled: Boolean(authSession.session.activeOrganizationId),
		...CACHE_STATIC,
	});

	// Get statuses
	const [statuses] = useQuery(
		queries.getWorkspaceStatuses(queryCtx, workspaceId),
		{ enabled: Boolean(workspaceId), ...CACHE_NAV },
	);

	// Track collapsed groups (inverse logic - track what's collapsed, not expanded)
	// This way we only store the minority case (completed/canceled are collapsed)
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		new Set(),
	);

	// Track which workspace we've seen to reset collapsed state on workspace change
	const prevWorkspaceRef = useRef(workspaceId);
	useEffect(() => {
		if (workspaceId && prevWorkspaceRef.current !== workspaceId) {
			prevWorkspaceRef.current = workspaceId;
			setCollapsedGroups(new Set());
		}
	}, [workspaceId]);

	const toggleGroup = useCallback((statusId: string) => {
		// Use startTransition to keep UI responsive during group toggle
		setCollapsedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(statusId)) {
				next.delete(statusId);
			} else {
				next.add(statusId);
			}
			return next;
		});
	}, []);

	// Single-pass: group, sort, flatten, compute active count & sticky indices
	const { flatItems, activeCount, stickyIndices } = useMemo(() => {
		const items: ListItem[] = [];
		const sticky: number[] = [];
		let active = 0;

		if (allMatters.length === 0) {
			return { flatItems: items, activeCount: 0, stickyIndices: sticky };
		}

		// Group tasks by status ID
		const groupMap = new Map<string, StatusGroup>();

		for (const task of allMatters) {
			const statusId = task.status?.id || "no-status";
			let group = groupMap.get(statusId);

			if (!group) {
				const statusType = (task.status?.type ?? "not_started") as StatusType;
				group = {
					statusId,
					status: task.status,
					tasks: [],
					isCompleted: COLLAPSED_STATUS_TYPES.has(statusType),
					order: STATUS_TYPE_ORDER[statusType] ?? 99,
				};
				groupMap.set(statusId, group);
			}

			group.tasks.push(task);
			if (!group.isCompleted) active++;
		}

		// Sort groups by status order
		const groups = Array.from(groupMap.values());
		groups.sort((a, b) => a.order - b.order);

		// Build flat items list with sticky indices in one pass
		for (const group of groups) {
			// User toggled state takes precedence, otherwise collapse completed types
			const isCollapsed = collapsedGroups.has(group.statusId)
				? !group.isCompleted // If toggled and was completed type → expand
				: group.isCompleted; // Default: completed types collapsed
			const isExpanded = !isCollapsed;

			// Track sticky index (header position)
			sticky.push(items.length);

			items.push({
				type: "header",
				id: `header-${group.statusId}`,
				status: group.status,
				count: group.tasks.length,
				isCompleted: group.isCompleted,
				isExpanded,
			});

			if (isExpanded) {
				for (const task of group.tasks) {
					items.push({
						type: "task",
						id: task.id,
						task,
						isCompleted: group.isCompleted,
					});
				}
			}
		}

		return { flatItems: items, activeCount: active, stickyIndices: sticky };
	}, [allMatters, collapsedGroups]);

	// Mutator callbacks - useCallback here is justified since these are passed to
	// many memoized child components and z reference is stable
	const handlePriorityChange = useCallback(
		(taskId: string, priority: PriorityValue) => {
			z.mutate.matter.update({ id: taskId, priority });
		},
		[z],
	);

	const handleStatusChange = useCallback(
		(taskId: string, statusId: string) => {
			z.mutate.matter.updateStatus({ id: taskId, statusId });
		},
		[z],
	);

	const handleAssigneeChange = useCallback(
		(taskId: string, userId: string | null) => {
			z.mutate.matter.assign({ id: taskId, assigneeId: userId });
		},
		[z],
	);

	if (!workspace) {
		return null;
	}

	// User permissions
	const userMembership = workspace.memberships?.find(
		(m) => m.userId === authSession.user.id,
	);
	const userRole = userMembership?.role as keyof typeof workspaceRole;
	const isManager = userRole === "manager";
	const canCreateRequest = isManager || userRole === "member";

	const dialogProps = {
		workspaceId: workspace.id,
		workspaceCode: workspace.code,
		workspaceName: workspace.name,
		workspaceMembers: workspace.memberships || [],
	};

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between gap-2 border-b bg-background px-3 md:px-4 h-12 md:h-12 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<SidebarTrigger className="lg:hidden shrink-0 -ml-1" />
					<h5 className="truncate text-base font-semibold">{workspace.name}</h5>
					<Badge
						variant="outline"
						className="text-xs tabular-nums shrink-0 hidden sm:inline-flex"
					>
						{activeCount} active
					</Badge>
					<span className="text-muted-foreground text-xs sm:hidden">
						({activeCount})
					</span>
				</div>
				<div className="flex items-center gap-1.5 md:gap-2">
					{isManager && (
						<CreateTaskDialog {...dialogProps} statuses={statuses} />
					)}
					{canCreateRequest && <CreateRequestDialog {...dialogProps} />}
				</div>
			</div>
			{/* Task List - Virtualized */}
			<div className="flex-1 min-h-0">
				{flatItems.length === 0 ? (
					<WorkspaceEmptyState
						isManager={isManager}
						canCreateRequest={canCreateRequest}
						dialogProps={dialogProps}
						statuses={statuses}
					/>
				) : (
					<VirtualizedList
						items={flatItems}
						getItemKey={(item) => item.id}
						estimateSize={40} // Average size (header=40, task=48)
						stickyIndices={stickyIndices}
						renderItem={(item: ListItem) => {
							if (item.type === "header") {
								return (
									<GroupHeader
										key={item.id}
										status={item.status}
										status_id={item.status?.id || "no-status"}
										count={item.count}
										isExpanded={item.isExpanded}
										onToggle={toggleGroup}
									/>
								);
							}
							return (
								<TaskRow
									key={item.id}
									task={item.task}
									orgSlug={orgSlug}
									members={members}
									statuses={statuses}
									isCompleted={item.isCompleted}
									onPriorityChange={handlePriorityChange}
									onStatusChange={handleStatusChange}
									onAssigneeChange={handleAssigneeChange}
								/>
							);
						}}
					/>
				)}
			</div>
		</div>
	);
}

// Empty state component
const WorkspaceEmptyState = memo(function WorkspaceEmptyState({
	isManager,
	canCreateRequest,
	dialogProps,
	statuses,
}: {
	isManager: boolean;
	canCreateRequest: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: Props type
	dialogProps: any;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	statuses: any[];
}) {
	return (
		<EmptyStateCard
			icon={ListTodoIcon}
			title="No tasks yet"
			description="Get started by creating your first task or submitting a request."
		>
			{isManager && (
				<CreateTaskDialog
					{...dialogProps}
					statuses={statuses}
					triggerButton={
						<Button size="default" className="gap-2">
							<PlusIcon className="size-4" />
							Create Your First Task
						</Button>
					}
				/>
			)}
			{canCreateRequest && (
				<CreateRequestDialog
					{...dialogProps}
					triggerButton={
						<Button size="default" variant="secondary" className="gap-2">
							<MessageSquareIcon className="size-4" />
							Submit a Request
						</Button>
					}
				/>
			)}
		</EmptyStateCard>
	);
});

// Group Header Component - uses status_id to avoid inline arrow function in onClick
const GroupHeader = memo(function GroupHeader({
	status,
	status_id,
	count,
	isExpanded,
	onToggle,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	status: any;
	status_id: string;
	count: number;
	isExpanded: boolean;
	onToggle: (statusId: string) => void;
}) {
	const statusType = (status?.type ?? "not_started") as StatusType;
	const StatusIcon = STATUS_TYPE_ICONS[statusType];
	const statusColor = STATUS_TYPE_COLORS[statusType];
	const label = status?.name || "Unknown";

	const handleClick = useCallback(
		() => onToggle(status_id),
		[onToggle, status_id],
	);

	return (
		<button
			type="button"
			className="flex w-full items-center gap-2 px-4 h-10 bg-muted border-b cursor-pointer select-none hover:bg-muted"
			onClick={handleClick}
		>
			<ChevronDown
				className={cn(
					"size-4 text-muted-foreground transition-transform",
					!isExpanded && "-rotate-90",
				)}
			/>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				{StatusIcon && (
					<StatusIcon className={cn("size-4 shrink-0", statusColor)} />
				)}
				<span className="text-sm font-medium truncate">{label}</span>
			</div>
			<Badge
				variant="secondary"
				className="text-[10px] h-5 px-1.5 min-w-5 justify-center shrink-0 tabular-nums"
			>
				{count}
			</Badge>
		</button>
	);
});

// Task row - optimized with bound handlers to avoid inline arrow functions
const TaskRow = memo(function TaskRow({
	task,
	orgSlug,
	members,
	statuses,
	isCompleted,
	onPriorityChange,
	onStatusChange,
	onAssigneeChange,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	task: any;
	orgSlug: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	members: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	statuses: any[];
	isCompleted: boolean;
	onPriorityChange: (taskId: string, priority: PriorityValue) => void;
	onStatusChange: (taskId: string, statusId: string) => void;
	onAssigneeChange: (taskId: string, userId: string | null) => void;
}) {
	const {
		id: taskId,
		workspaceCode,
		shortID,
		priority,
		statusId,
		assigneeId,
		title,
		dueDate,
	} = task;
	const linkTo = `/${orgSlug}/matter/${workspaceCode}-${shortID}`;
	const taskCode = `${workspaceCode}-${shortID}`;

	// Bind taskId once - these don't need useCallback since memo comparison handles it
	const handlePriority = (p: PriorityValue) => onPriorityChange(taskId, p);
	const handleStatus = (s: string) => onStatusChange(taskId, s);
	const handleAssignee = (u: string | null) => onAssigneeChange(taskId, u);

	return (
		<div className="group relative border-b border-border/40 last:border-0 transition-colors hover:bg-muted/50 active:bg-muted/70">
			<StableLink
				to={linkTo}
				className={cn("absolute inset-0 z-0", isCompleted && "opacity-60")}
			/>

			{/* Mobile Layout */}
			<div className="flex md:hidden flex-col gap-1.5 px-3 py-3">
				{/* Top row: Priority + Title + Assignee */}
				<div className="flex items-center gap-2">
					<div className="relative z-10 shrink-0">
						<PrioritySelect
							value={(priority ?? 4) as PriorityValue}
							onChange={handlePriority}
							align="start"
						/>
					</div>
					<p
						className={cn(
							"flex-1 min-w-0 truncate text-sm font-medium text-foreground/90",
							isCompleted && "line-through text-muted-foreground",
						)}
					>
						{title}
					</p>
					<div className="relative z-10 shrink-0">
						<AssigneeSelect
							value={assigneeId || null}
							members={members}
							onChange={handleAssignee}
							align="end"
						/>
					</div>
				</div>
				{/* Bottom row: Code + Status + Due Date */}
				<div className="flex items-center gap-2 pl-7">
					<span className="font-mono text-[11px] text-muted-foreground/60">
						{taskCode}
					</span>
					<div className="relative z-10">
						<StatusSelect
							value={statusId || ""}
							statuses={statuses}
							onChange={handleStatus}
							align="start"
						/>
					</div>
					{dueDate && (
						<div className="relative z-10 ml-auto">
							<DueDateBadge date={dueDate} compact />
						</div>
					)}
				</div>
			</div>

			{/* Desktop Layout */}
			<div className="hidden md:grid grid-cols-[auto_5rem_auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-sm">
				{/* Priority */}
				<div className="relative z-10">
					<PrioritySelect
						value={(priority ?? 4) as PriorityValue}
						onChange={handlePriority}
						align="start"
					/>
				</div>

				{/* ID */}
				<div className="relative z-10 font-mono text-xs text-muted-foreground/50 pointer-events-none">
					{taskCode}
				</div>

				{/* Status */}
				<div className="relative z-10">
					<StatusSelect
						value={statusId || ""}
						statuses={statuses}
						onChange={handleStatus}
						align="start"
					/>
				</div>

				{/* Title */}
				<div className="relative z-10 min-w-0 pointer-events-none">
					<p
						className={cn(
							"truncate font-medium text-foreground/90",
							isCompleted && "line-through text-muted-foreground",
						)}
					>
						{title}
					</p>
				</div>

				{/* Due Date */}
				<div className="relative z-10">
					{dueDate && <DueDateBadge date={dueDate} />}
				</div>

				{/* Assignee */}
				<div className="relative z-10">
					<AssigneeSelect
						value={assigneeId || null}
						members={members}
						onChange={handleAssignee}
						align="end"
					/>
				</div>
			</div>
		</div>
	);
});

function DueDateBadge({ date, compact }: { date: number; compact?: boolean }) {
	const label = formatCompactRelativeDate(date);
	const colorClass =
		label === "Overdue"
			? "text-destructive font-medium"
			: label === "Today"
				? "text-orange-500 font-medium"
				: label === "Tomorrow"
					? "text-blue-500"
					: "text-muted-foreground";

	return (
		<div
			className={cn(
				"flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted",
				colorClass,
			)}
		>
			{!compact && <CalendarIcon className="size-3" />}
			<span>{label}</span>
		</div>
	);
}
