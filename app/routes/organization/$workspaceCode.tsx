import { useQuery } from "@rocicorp/zero/react";
import {
	CalendarIcon,
	ChevronDown,
	ListTodoIcon,
	MessageSquareIcon,
	PlusIcon,
} from "lucide-react";
import {
	memo,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useState,
} from "react";
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

export default function WorkspaceIndex() {
	const { orgSlug, queryCtx, authSession } = useOrgLoaderData();
	const params = useParams();
	const z = useZ();

	const { workspaceCode } = params; // Direct usage - data loads instantly from IndexedDB

	// Defer expensive renders during workspace transitions
	const deferredWorkspaceCode = useDeferredValue(workspaceCode);
	const isStale = workspaceCode !== deferredWorkspaceCode;

	// Workspace list query
	const [workspacesData] = useQuery(
		queries.getWorkspacesList(queryCtx),
		CACHE_NAV,
	);

	// Find workspace - simple find, no sorting needed
	// Use immediate workspaceCode for header, deferred for heavy content
	const workspace = useMemo(
		() => workspacesData.find((w) => w.code === workspaceCode),
		[workspacesData, workspaceCode],
	);

	// Deferred workspace for heavy content rendering
	const deferredWorkspace = useMemo(() => {
		return workspacesData.find((w) => w.code === deferredWorkspaceCode);
	}, [workspacesData, deferredWorkspaceCode]);
	const deferredWorkspaceId = deferredWorkspace?.id ?? "";

	// Get matters - Use deferred workspace ID to avoid blocking UI
	const [allMatters] = useQuery(
		queries.getWorkspaceMatters(queryCtx, deferredWorkspaceId),
		{ enabled: Boolean(deferredWorkspaceId), ...CACHE_NAV },
	);

	// Get members (cached longer)
	const [members] = useQuery(queries.getOrganizationMembers(queryCtx), {
		enabled: Boolean(authSession.session.activeOrganizationId),
		...CACHE_STATIC,
	});

	// Get statuses - use deferred for consistency with matters
	const [statuses] = useQuery(
		queries.getWorkspaceStatuses(queryCtx, deferredWorkspaceId),
		{ enabled: Boolean(deferredWorkspaceId), ...CACHE_NAV },
	);

	// State for expanded groups
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [hasInitializedGroups, setHasInitializedGroups] = useState(false);

	// Reset group initialization when workspace changes
	useEffect(() => {
		setHasInitializedGroups(false);
		setExpandedGroups(new Set());
	}, [deferredWorkspaceCode]);

	useEffect(() => {
		if (statuses.length > 0 && !hasInitializedGroups) {
			// Default all open
			setExpandedGroups(new Set(statuses.map((s) => s.id).concat("no-status")));
			setHasInitializedGroups(true);
		}
	}, [statuses, hasInitializedGroups]);

	const toggleGroup = useCallback((statusId: string) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(statusId)) {
				next.delete(statusId);
			} else {
				next.add(statusId);
			}
			return next;
		});
	}, []);

	// Group by status and sort groups - data is partially sorted by priority/due date from server
	// Since Zero can't order by related columns, we group by status and sort groups client-side
	const { flatItems, activeCount } = useMemo(() => {
		if (allMatters.length === 0) {
			return { flatItems: [], activeCount: 0 };
		}

		// Group tasks by status ID
		const groupMap = new Map<
			string,
			{
				status: (typeof allMatters)[0]["status"];
				tasks: typeof allMatters;
				isCompleted: boolean;
			}
		>();

		for (const task of allMatters) {
			const statusId = task.status?.id || "no-status";
			const existing = groupMap.get(statusId);
			if (existing) {
				existing.tasks.push(task);
			} else {
				const statusType = (task.status?.type ?? "not_started") as StatusType;
				groupMap.set(statusId, {
					status: task.status,
					tasks: [task],
					isCompleted: COMPLETED_STATUS_TYPES.includes(statusType),
				});
			}
		}

		// Sort groups
		const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
			const aType = (a.status?.type ?? "not_started") as StatusType;
			const bType = (b.status?.type ?? "not_started") as StatusType;
			return (
				(STATUS_TYPE_ORDER[aType] ?? 99) - (STATUS_TYPE_ORDER[bType] ?? 99)
			);
		});

		// Flatten into list items
		const items: ListItem[] = [];
		let active = 0;

		// Helper to add group to items
		const addGroup = (group: (typeof sortedGroups)[0]) => {
			const statusId = group.status?.id || "no-status";
			const isExpanded = expandedGroups.has(statusId);

			if (!group.isCompleted) active += group.tasks.length;

			items.push({
				type: "header",
				id: `header-${statusId}`,
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
		};

		// Add active groups
		for (const group of sortedGroups.filter((g) => !g.isCompleted)) {
			addGroup(group);
		}

		// Add completed groups
		for (const group of sortedGroups.filter((g) => g.isCompleted)) {
			addGroup(group);
		}

		return { flatItems: items, activeCount: active };
	}, [allMatters, expandedGroups]);

	// Memoized mutator functions
	const onPriorityChange = useCallback(
		(taskId: string, priority: PriorityValue) => {
			z.mutate.matter.update({ id: taskId, priority });
		},
		[z],
	);

	const onStatusChange = useCallback(
		(taskId: string, statusId: string) => {
			z.mutate.matter.updateStatus({ id: taskId, statusId });
		},
		[z],
	);

	const onAssigneeChange = useCallback(
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
			<div className="flex items-center justify-between gap-2 border-b bg-background px-4 h-12 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<SidebarTrigger className="lg:hidden shrink-0" />
					<h5 className="truncate">{workspace.name}</h5>
					<span className="text-muted-foreground text-sm">· {activeCount}</span>
				</div>
				<div className="flex items-center gap-2">
					{isManager && (
						<CreateTaskDialog {...dialogProps} statuses={statuses} />
					)}
					{canCreateRequest && <CreateRequestDialog {...dialogProps} />}
				</div>
			</div>

			{/* Task List - Virtualized */}
			<div
				className="flex-1 min-h-0"
				style={{ opacity: isStale ? 0.7 : 1, transition: "opacity 100ms" }}
			>
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
						renderItem={(item) => {
							if (item.type === "header") {
								return (
									<GroupHeader
										key={item.id}
										status={item.status}
										count={item.count}
										isExpanded={item.isExpanded}
										onToggle={() => toggleGroup(item.status?.id || "no-status")}
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
									onPriorityChange={onPriorityChange}
									onStatusChange={onStatusChange}
									onAssigneeChange={onAssigneeChange}
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

// Group Header Component
const GroupHeader = memo(function GroupHeader({
	status,
	count,
	isExpanded,
	onToggle,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Zero query type
	status: any;
	count: number;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const statusType = (status?.type ?? "not_started") as StatusType;
	const StatusIcon = STATUS_TYPE_ICONS[statusType];
	const statusColor = STATUS_TYPE_COLORS[statusType];
	const label = status?.name || "Unknown";

	return (
		<button
			type="button"
			className="z-20 flex w-full items-center gap-2 px-4 py-2 bg-muted/90 backdrop-blur-sm border-y border-border/40 cursor-pointer select-none hover:bg-muted transition-colors text-left"
			onClick={onToggle}
		>
			<ChevronDown
				className={cn(
					"size-4 transition-transform duration-200",
					!isExpanded && "-rotate-90",
				)}
			/>
			<div className="flex items-center gap-2">
				{StatusIcon && (
					<StatusIcon className={cn("size-4 shrink-0", statusColor)} />
				)}
				<span className="text-sm font-medium">{label}</span>
				<Badge
					variant="secondary"
					className="text-[10px] h-5 px-1.5 min-w-5 justify-center"
				>
					{count}
				</Badge>
			</div>
		</button>
	);
});

// Optimized task row - no hooks, callbacks passed from parent
const TaskRow = memo(
	function TaskRow({
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
		const taskId = task.id;
		const linkTo = `/${orgSlug}/matter/${task.workspaceCode}-${task.shortID}`;
		const taskCode = `${task.workspaceCode}-${task.shortID}`;

		return (
			<div className="group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_5rem_auto_1fr_auto_auto] items-center gap-2 md:gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 border-b border-border/40 last:border-0">
				<StableLink
					to={linkTo}
					className={cn("absolute inset-0 z-0", isCompleted && "opacity-60")}
				/>

				{/* Priority */}
				<div className="relative z-10">
					<PrioritySelect
						value={(task.priority ?? 4) as PriorityValue}
						onChange={(p) => onPriorityChange(taskId, p)}
						align="start"
					/>
				</div>

				{/* ID - Desktop only */}
				<div className="relative z-10 hidden md:block font-mono text-xs text-muted-foreground/50 pointer-events-none">
					{taskCode}
				</div>

				{/* Status - Desktop only */}
				<div className="relative z-10 hidden md:block">
					<StatusSelect
						value={task.statusId || ""}
						statuses={statuses}
						onChange={(s) => onStatusChange(taskId, s)}
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
						{task.title}
					</p>
				</div>

				{/* Due Date - Desktop only */}
				<div className="relative z-10 hidden md:block">
					{task.dueDate && <DueDateBadge date={task.dueDate} />}
				</div>

				{/* Assignee */}
				<div className="relative z-10">
					<AssigneeSelect
						value={task.assigneeId || null}
						members={members}
						onChange={(u) => onAssigneeChange(taskId, u)}
						align="end"
					/>
				</div>
			</div>
		);
	},
	(prev, next) =>
		(prev.task === next.task ||
			(prev.task.id === next.task.id &&
				prev.task.title === next.task.title &&
				prev.task.priority === next.task.priority &&
				prev.task.statusId === next.task.statusId &&
				prev.task.assigneeId === next.task.assigneeId &&
				prev.task.dueDate === next.task.dueDate &&
				prev.isCompleted === next.isCompleted)) &&
		prev.members === next.members &&
		prev.statuses === next.statuses,
);

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
