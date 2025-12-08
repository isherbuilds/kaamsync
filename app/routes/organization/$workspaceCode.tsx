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
	useRef,
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
	const [allMatters, mattersResult] = useQuery(
		queries.getWorkspaceMatters(queryCtx, deferredWorkspaceId),
		{ enabled: Boolean(deferredWorkspaceId), ...CACHE_NAV },
	);

	// Get members (cached longer)
	const [members] = useQuery(queries.getOrganizationMembers(queryCtx), {
		enabled: Boolean(authSession.session.activeOrganizationId),
		...CACHE_STATIC,
	});

	// Get statuses - use deferred for consistency with matters
	const [statuses, statusesResult] = useQuery(
		queries.getWorkspaceStatuses(queryCtx, deferredWorkspaceId),
		{ enabled: Boolean(deferredWorkspaceId), ...CACHE_NAV },
	);

	// Track if data is ready - prevent showing partial state during transitions
	// This ensures we don't show empty status headers before matters load
	// Zero query result types: 'complete' | 'unknown' | 'error'
	// We consider data ready if both queries have settled (not just statuses alone)
	// or if matters array has items (we have actual task data to show)
	const isDataReady =
		!deferredWorkspaceId ||
		allMatters.length > 0 ||
		(mattersResult.type === "complete" && statusesResult.type === "complete");

	// State for expanded groups
	const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
	const [lastInitializedWorkspaceId, setLastInitializedWorkspaceId] = useState<
		string | null
	>(null);

	// Initialize expanded groups when workspace or statuses change
	useEffect(() => {
		// Reset and reinitialize when workspace changes
		if (deferredWorkspaceId !== lastInitializedWorkspaceId) {
			if (statuses.length > 0) {
				// Default all open
				setExpandedGroups(
					new Set(statuses.map((s) => s.id).concat("no-status")),
				);
				setLastInitializedWorkspaceId(deferredWorkspaceId);
			} else if (deferredWorkspaceId) {
				// Clear while waiting for new statuses
				setExpandedGroups(new Set());
			}
		}
	}, [deferredWorkspaceId, statuses, lastInitializedWorkspaceId]);

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

	// Group by status and flatten into list items
	const { flatItems, activeCount } = useMemo(() => {
		if (!allMatters.length)
			return { flatItems: [] as ListItem[], activeCount: 0 };

		// Group tasks by status ID
		const groups: {
			status: (typeof allMatters)[0]["status"];
			tasks: typeof allMatters;
			isCompleted: boolean;
		}[] = [];
		const groupIdx = new Map<string, number>();

		for (const task of allMatters) {
			const statusId = task.status?.id || "no-status";
			const idx = groupIdx.get(statusId);
			if (idx !== undefined) {
				groups[idx].tasks.push(task);
			} else {
				const statusType = (task.status?.type ?? "not_started") as StatusType;
				groupIdx.set(statusId, groups.length);
				groups.push({
					status: task.status,
					tasks: [task],
					isCompleted: COMPLETED_STATUS_TYPES.includes(statusType),
				});
			}
		}

		// Sort: active groups first, then completed, each sorted by status type order
		groups.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			const aOrder =
				STATUS_TYPE_ORDER[(a.status?.type ?? "not_started") as StatusType] ??
				99;
			const bOrder =
				STATUS_TYPE_ORDER[(b.status?.type ?? "not_started") as StatusType] ??
				99;
			return aOrder - bOrder;
		});

		// Flatten into list items
		const items: ListItem[] = [];
		let active = 0;

		for (const group of groups) {
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
		}

		return { flatItems: items, activeCount: active };
	}, [allMatters, expandedGroups]);

	// Keep reference to last valid items to prevent flash during transitions
	const lastValidItemsRef = useRef<{ items: ListItem[]; count: number }>({
		items: [],
		count: 0,
	});

	// Update ref when we have valid data
	if (isDataReady && flatItems.length > 0) {
		lastValidItemsRef.current = { items: flatItems, count: activeCount };
	}

	// Use current items if ready, otherwise fall back to last valid items during transition
	const displayItems = isDataReady
		? flatItems
		: lastValidItemsRef.current.items;
	const displayCount = isDataReady
		? activeCount
		: lastValidItemsRef.current.count;

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
					<span className="text-muted-foreground text-sm">
						· {displayCount}
					</span>
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
				style={{
					opacity: isStale || !isDataReady ? 0.7 : 1,
					transition: "opacity 100ms",
				}}
			>
				{displayItems.length === 0 ? (
					isDataReady ? (
						<WorkspaceEmptyState
							isManager={isManager}
							canCreateRequest={canCreateRequest}
							dialogProps={dialogProps}
							statuses={statuses}
						/>
					) : null
				) : (
					<VirtualizedList
						items={displayItems}
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

// Task row - mobile-first for deskless workers with large touch targets
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
		const {
			id,
			workspaceCode: wCode,
			shortID,
			title,
			priority,
			statusId,
			assigneeId,
			dueDate,
		} = task;
		const linkTo = `/${orgSlug}/matter/${wCode}-${shortID}`;

		return (
			<div
				className={cn(
					"group relative border-b border-border/40 last:border-0 transition-colors",
					"active:bg-muted/70 hover:bg-muted/50", // Better touch feedback
					isCompleted && "opacity-60",
				)}
			>
				<StableLink to={linkTo} className="absolute inset-0 z-0" />

				{/* Mobile-first layout: two rows for clarity on small screens */}
				<div className="flex flex-col gap-1 px-3 py-3 md:px-4 md:py-2.5">
					<div className="flex items-center gap-2 min-h-10">
						{/* Priority - 44px min touch target */}
						<div className="relative z-10 -m-1 p-1">
							<PrioritySelect
								value={(priority ?? 4) as PriorityValue}
								onChange={(p) => onPriorityChange(id, p)}
								align="start"
							/>
						</div>

						{/* Title */}
						<p
							className={cn(
								"flex-1 truncate text-sm font-medium min-w-0 leading-5",
								isCompleted && "line-through text-muted-foreground",
							)}
						>
							{title}
						</p>

						{/* Assignee - 44px touch target */}
						<div className="relative z-10 -m-1 p-1">
							<AssigneeSelect
								value={assigneeId || null}
								members={members}
								onChange={(u) => onAssigneeChange(id, u)}
								align="end"
							/>
						</div>
					</div>

					<div className="flex items-center gap-3 text-xs text-muted-foreground">
						{/* Status */}
						<div className="relative z-10 -m-1 p-1">
							<StatusSelect
								value={statusId || ""}
								statuses={statuses}
								onChange={(s) => onStatusChange(id, s)}
								align="start"
								compact
							/>
						</div>

						{/* ID */}
						<span className="font-mono text-[11px] text-muted-foreground/70">
							{wCode}-{shortID}
						</span>

						{/* Due date */}
						{dueDate && <DueDateBadge date={dueDate} />}
					</div>
				</div>
			</div>
		);
	},
	(prev, next) =>
		prev.task === next.task ||
		(prev.task.id === next.task.id &&
			prev.task.title === next.task.title &&
			prev.task.priority === next.task.priority &&
			prev.task.statusId === next.task.statusId &&
			prev.task.assigneeId === next.task.assigneeId &&
			prev.task.dueDate === next.task.dueDate &&
			prev.isCompleted === next.isCompleted &&
			prev.members === next.members &&
			prev.statuses === next.statuses),
);

const DUE_COLORS: Record<string, string> = {
	Overdue: "text-destructive font-medium",
	Today: "text-orange-500 font-medium",
	Tomorrow: "text-blue-500",
};

function DueDateBadge({
	date,
	className,
}: {
	date: number;
	className?: string;
}) {
	const label = formatCompactRelativeDate(date);
	return (
		<div
			className={cn(
				"flex items-center gap-1 text-xs",
				DUE_COLORS[label] || "text-muted-foreground",
				className,
			)}
		>
			<CalendarIcon className="size-3" />
			<span>{label}</span>
		</div>
	);
}
