import type { Row } from "@rocicorp/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { CalendarIcon, ChevronDown, ListTodoIcon } from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import { CreateRequestDialog } from "~/components/create-request-dialog";
import { CreateTaskDialog } from "~/components/create-task-dialog";
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
import type { WorkspaceRole } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import {
	COMPLETED_STATUS_TYPES,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	STATUS_TYPE_ORDER,
	type StatusType,
} from "~/lib/matter-constants";
import { cn, formatCompactRelativeDate } from "~/lib/utils";
import type { Route } from "./+types/$workspaceCode";

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `${params.workspaceCode} - Tasks` },
];

type Matter = Row["mattersTable"] & { status: Row["statusesTable"] };
type Status = Row["statusesTable"];

type HeaderItem = {
	type: "header";
	id: string;
	status: Status;
	count: number;
	isExpanded: boolean;
};
type TaskItem = {
	type: "task";
	id: string;
	task: Matter;
	isCompleted: boolean;
};
type ListItem = HeaderItem | TaskItem;

const COLLAPSED_TYPES = new Set<string>(COMPLETED_STATUS_TYPES);

export default function WorkspaceIndex() {
	const { orgSlug, authSession } = useOrgLoaderData();
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

	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

	// Reset if switching workspace
	const lastWs = useRef(workspaceId);
	if (lastWs.current !== workspaceId) {
		setCollapsed(new Set());
		lastWs.current = workspaceId;
	}

	const toggleGroup = useCallback((id: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}, []);

	// 2. Transformation
	const { flatItems, activeCount, stickyIndices } = useMemo(() => {
		if (!matters.length || !statuses.length)
			return { flatItems: [], activeCount: 0, stickyIndices: [] };

		const groups = new Map<
			string,
			{ status: Status; tasks: Matter[]; order: number }
		>();
		let active = 0;

		for (const m of matters) {
			const s = m.status;
			if (!s) continue;
			let g = groups.get(s.id);
			if (!g) {
				const type = (s.type ?? "not_started") as StatusType;
				g = { status: s, tasks: [], order: STATUS_TYPE_ORDER[type] ?? 99 };
				groups.set(s.id, g);
			}
			g.tasks.push(m as Matter);
			if (!COLLAPSED_TYPES.has(s.type)) active++;
		}

		const sortedGroups = Array.from(groups.values()).sort(
			(a, b) => a.order - b.order,
		);
		const items: ListItem[] = [];
		const sticky: number[] = [];

		for (const g of sortedGroups) {
			const isCompletedType = COLLAPSED_TYPES.has(g.status.type);
			const isExpanded = collapsed.has(g.status.id)
				? isCompletedType
				: !isCompletedType;

			sticky.push(items.length);
			items.push({
				type: "header",
				id: `h-${g.status.id}`,
				status: g.status,
				count: g.tasks.length,
				isExpanded,
			});

			if (isExpanded) {
				for (const t of g.tasks) {
					items.push({
						type: "task",
						id: t.id,
						task: t,
						isCompleted: isCompletedType,
					});
				}
			}
		}
		return { flatItems: items, activeCount: active, stickyIndices: sticky };
	}, [matters, statuses, collapsed]);

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
	// Must be before early return to avoid conditional hooks
	const taskStatuses = useMemo(
		() => statuses.filter((s) => !s.isRequestStatus),
		[statuses],
	);
	const requestStatuses = useMemo(
		() => statuses.filter((s) => s.isRequestStatus),
		[statuses],
	);

	if (!workspace) return null;

	const membership = workspace.memberships?.find(
		(m) => m.userId === authSession.user.id,
	);
	const role = membership?.role as WorkspaceRole;

	const dialogProps = {
		workspaceId: workspace.id,
		workspaceCode: workspace.code,
		workspaceName: workspace.name,
		workspaceMembers: workspace.memberships ?? [],
		statuses: taskStatuses,
	};

	const requestDialogProps = {
		...dialogProps,
		statuses: requestStatuses.length > 0 ? requestStatuses : taskStatuses,
	};

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background">
			<Header
				name={workspace.name}
				count={activeCount}
				isManager={role === "manager"}
				canRequest={role === "manager" || role === "member"}
				dialogProps={dialogProps}
				requestDialogProps={requestDialogProps}
			/>

			<div className="min-h-0 flex-1">
				{flatItems.length === 0 ? (
					<WorkspaceEmptyState
						isManager={role === "manager"}
						canRequest={role === "manager" || role === "member"}
						dialogProps={dialogProps}
						requestDialogProps={requestDialogProps}
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

const Header = memo(
	({
		name,
		count,
		isManager,
		canRequest,
		dialogProps,
		requestDialogProps,
	}: any) => (
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
				{isManager && <CreateTaskDialog {...dialogProps} />}
				{canRequest && <CreateRequestDialog {...requestDialogProps} />}
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

const TaskRow = memo(
	({
		item,
		orgSlug,
		members,
		statuses,
		onPriority,
		onStatus,
		onAssign,
	}: any) => {
		const { task, isCompleted } = item as TaskItem;
		const taskCode = `${task.workspaceCode}-${task.shortID}`;
		const link = `/${orgSlug}/matter/${taskCode}`;

		return (
			<div className="group relative flex h-11 items-center border-transparent border-b transition-colors hover:border-border/50 hover:bg-muted/30">
				<StableLink to={link} className="absolute inset-0 z-10" />

				<div className="relative flex w-full items-center gap-3 px-3">
					<div className="flex shrink-0 items-center gap-3">
						<PrioritySelect
							value={task.priority as PriorityValue}
							onChange={(p) => onPriority(task.id, p)}
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
							onChange={(s) => onStatus(task.id, s)}
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
							onChange={(u) => onAssign(task.id, u)}
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
	({ isManager, canRequest, dialogProps, requestDialogProps }: any) => (
		<div className="flex h-full items-center justify-center p-8">
			<EmptyStateCard
				icon={ListTodoIcon}
				title="All clear"
				description="No active tasks in this workspace. Rest easy or create a new one."
			>
				<div className="flex gap-2">
					{isManager && <CreateTaskDialog {...dialogProps} />}
					{canRequest && (
						<CreateRequestDialog
							{...requestDialogProps}
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
