import { useQuery } from "@rocicorp/zero/react";
import {
	Bell,
	CheckCircle2,
	ChevronRight,
	Clock,
	Link as LinkIcon,
	MoreHorizontal,
	Plus,
	Sidebar,
	Star,
} from "lucide-react";
import { memo, useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import {
	AssigneeSelect,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter-field-selectors";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { parseMatterKey } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { useZ } from "~/hooks/use-zero-cache";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { formatTimelineDate, getInitials } from "~/lib/utils";
import type { Route } from "./+types/matter.$matterKey";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const matterKey = params.matterKey;
	if (!matterKey) {
		throw new Response("Not Found", { status: 404 });
	}

	// Parse the matter key (e.g., "GEN-001" -> { code: "GEN", shortID: 1 })
	const parsed = parseMatterKey(matterKey);
	if (!parsed) {
		throw new Response("Invalid matter key format", { status: 400 });
	}

	return { matterKey, parsed };
}

export default function TaskDetailPage({ loaderData }: Route.ComponentProps) {
	const { authSession, queryCtx, orgSlug } = useOrgLoaderData();
	const { parsed } = loaderData;
	const navigate = useNavigate();

	const z = useZ();

	// Load matter via synced query with workspace code + shortID
	const [matter] = useQuery(
		queries.getMatterByKey(queryCtx, parsed.code, parsed.shortID),
		CACHE_NAV,
	);

	// Fetch organization members and workspace statuses once
	const [members] = useQuery(queries.getOrganizationMembers(queryCtx), {
		enabled: Boolean(queryCtx.activeOrganizationId),
		...CACHE_LONG,
	});
	const [statuses] = useQuery(
		queries.getWorkspaceStatuses(queryCtx, matter?.workspaceId || ""),
		{
			enabled: Boolean(matter?.workspaceId),
			...CACHE_LONG,
		},
	);

	// Determine admin privileges once from loaded members
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	const me = members.find((m: any) => m.userId === authSession.user.id);
	const isAdmin = !!(me && (me.role === "admin" || me.role === "owner"));

	// Define canEdit based on user role/ownership - safe even if matter is null
	const canEdit = matter
		? matter.authorId === authSession.user.id ||
			matter.assigneeId === authSession.user.id ||
			isAdmin
		: false;

	// Memoized handlers - safe to call before early return since matter?.id is used
	const handleStatusChange = useCallback(
		(newStatusId: string) => {
			if (!matter) return;
			z.mutate.matter.updateStatus({
				id: matter.id,
				statusId: newStatusId,
			});
		},
		[z, matter],
	);

	const handleAssign = useCallback(
		(assigneeId: string | null) => {
			if (!matter) return;
			z.mutate.matter.assign({
				id: matter.id,
				assigneeId: assigneeId || null,
			});
		},
		[z, matter],
	);

	const handlePriorityChange = useCallback(
		(priority: PriorityValue) => {
			if (!matter) return;
			z.mutate.matter.update({
				id: matter.id,
				priority,
			});
		},
		[z, matter],
	);

	// Early return after all hooks
	if (!matter) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-lg font-semibold">Task not found</p>
					<Button
						onClick={() => navigate(`/${orgSlug}/tasks`)}
						className="mt-4"
					>
						Back to Tasks
					</Button>
				</div>
			</div>
		);
	}

	const handleAddComment = async (e: React.FormEvent) => {
		e.preventDefault();
		// Implementation for adding comment would go here
	};

	return (
		<div className="@container flex h-full flex-col bg-background">
			{/* Top Navigation Bar */}
			<header className="flex h-12 shrink-0 items-center justify-between border-b px-4 text-sm">
				<div className="flex items-center gap-2 text-muted-foreground">
					<Button
						variant="ghost"
						size="sm"
						className="h-auto p-0 hover:text-foreground"
						onClick={() => navigate(`/${orgSlug}/tasks`)}
					>
						Inbox
					</Button>
					<ChevronRight className="size-4 opacity-50" />
					<span className="font-medium text-foreground">
						{matter.workspaceCode}-{matter.shortID}
					</span>
					<div className="ml-1 flex items-center">
						<Button variant="ghost" size="icon" className="size-6">
							<Star className="size-4" />
						</Button>
						<Button variant="ghost" size="icon" className="size-6">
							<MoreHorizontal className="size-4" />
						</Button>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-8">
						<Bell className="size-4 text-muted-foreground" />
					</Button>
					<Button variant="ghost" size="icon" className="size-8">
						<Clock className="size-4 text-muted-foreground" />
					</Button>
					<Button variant="ghost" size="icon" className="size-8">
						<Sidebar className="size-4 text-muted-foreground" />
					</Button>
				</div>
			</header>

			<div className="flex flex-1 flex-col overflow-hidden @3xl:flex-row">
				{/* Main Content */}
				<div className="flex-1 overflow-y-auto">
					<div className="mx-auto max-w-3xl px-4 py-6 @3xl:px-8 @3xl:py-10">
						<div className="space-y-6 @3xl:space-y-8">
							{/* Title & Description */}
							<div className="space-y-4">
								<h1 className="text-2xl font-bold tracking-tight @3xl:text-3xl">
									{matter.title}
								</h1>
								<div className="prose prose-sm max-w-none dark:prose-invert">
									<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 @3xl:text-base">
										{matter.description || (
											<span className="italic text-muted-foreground">
												No description provided.
											</span>
										)}
									</p>
								</div>
							</div>

							{/* Properties - Mobile/Tablet Only */}
							<div className="space-y-4 @3xl:hidden">
								<Separator />
								<div className="space-y-3">
									<h3 className="text-xs font-medium text-muted-foreground">
										Properties
									</h3>
									<div className="space-y-0.5">
										<PropertyRow label="Status">
											<StatusSelect
												value={matter.statusId || ""}
												statuses={statuses}
												onChange={handleStatusChange}
												disabled={!canEdit}
												showLabel
												className="h-7 w-full justify-start px-2"
											/>
										</PropertyRow>
										<PropertyRow label="Priority">
											<PrioritySelect
												value={
													(matter.priority ?? Priority.NONE) as PriorityValue
												}
												onChange={handlePriorityChange}
												showLabel
												className="h-7 w-full justify-start px-2"
											/>
										</PropertyRow>
										<PropertyRow label="Assignee">
											<AssigneeSelect
												value={matter.assigneeId || null}
												members={members}
												onChange={handleAssign}
												showLabel
												className="h-7 w-full justify-start px-2"
											/>
										</PropertyRow>
									</div>
								</div>
							</div>

							<Separator />

							{/* Activity / Comments */}
							<div className="space-y-6">
								<h2 className="text-sm font-semibold">Activity</h2>

								<form onSubmit={handleAddComment} className="space-y-3">
									<div className="relative rounded-lg border bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring">
										<Textarea
											placeholder="Leave a comment..."
											rows={3}
											className="resize-none border-0 bg-transparent focus-visible:ring-0"
										/>
										<div className="flex items-center justify-between border-t bg-muted/20 px-3 py-2">
											<Button
												variant="ghost"
												size="icon"
												className="size-6 text-muted-foreground"
											>
												<LinkIcon className="size-3.5" />
											</Button>
											<Button
												size="sm"
												type="submit"
												className="h-7 px-3 text-xs"
											>
												Comment
											</Button>
										</div>
									</div>
								</form>

								<TaskTimeline
									matterId={matter.id}
									queryCtx={queryCtx}
									members={members}
									statuses={statuses}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Right Sidebar - Desktop Only */}
				<div className="hidden w-80 shrink-0 overflow-y-auto border-l bg-muted/5 px-4 py-6 @3xl:block">
					<div className="space-y-8">
						<AdminApproveSection
							isVisible={matter.type === "request"}
							isAdmin={isAdmin}
							matterId={matter.id}
							statuses={statuses}
							z={z}
						/>

						<div className="space-y-3">
							<h3 className="px-2 text-xs font-medium text-muted-foreground">
								Properties
							</h3>
							<div className="space-y-0.5">
								<PropertyRow label="Status">
									<StatusSelect
										value={matter.statusId || ""}
										statuses={statuses}
										onChange={handleStatusChange}
										disabled={!canEdit}
										showLabel
										className="h-7 w-full justify-start px-2"
									/>
								</PropertyRow>
								<PropertyRow label="Priority">
									<PrioritySelect
										value={(matter.priority ?? Priority.NONE) as PriorityValue}
										onChange={handlePriorityChange}
										showLabel
										className="h-7 w-full justify-start px-2"
									/>
								</PropertyRow>
								<PropertyRow label="Assignee">
									<AssigneeSelect
										value={matter.assigneeId || null}
										members={members}
										onChange={handleAssign}
										showLabel
										className="h-7 w-full justify-start px-2"
									/>
								</PropertyRow>
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<div className="flex items-center justify-between px-2">
								<h3 className="text-xs font-medium text-muted-foreground">
									Labels
								</h3>
								<Button variant="ghost" size="icon" className="size-5">
									<Plus className="size-3.5" />
								</Button>
							</div>
							<div className="px-2">
								{matter.type === "request" ? (
									<div className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-400">
										Request
									</div>
								) : (
									<div className="text-sm text-muted-foreground/50 italic">
										None
									</div>
								)}
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<div className="flex items-center justify-between px-2">
								<h3 className="text-xs font-medium text-muted-foreground">
									Project
								</h3>
								<Button variant="ghost" size="icon" className="size-5">
									<Plus className="size-3.5" />
								</Button>
							</div>
							<div className="px-2">
								<Button
									variant="ghost"
									size="sm"
									className="h-auto justify-start p-0 text-muted-foreground hover:text-foreground"
								>
									<span className="text-sm">Add to project...</span>
								</Button>
							</div>
						</div>

						<Separator />

						<div className="space-y-3">
							<h3 className="px-2 text-xs font-medium text-muted-foreground">
								Details
							</h3>
							<div className="space-y-2 px-2 text-sm">
								<div className="flex justify-between">
									<span className="text-muted-foreground">Created</span>
									<span>{new Date(matter.createdAt).toLocaleDateString()}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">Updated</span>
									<span>
										{new Date(
											matter.updatedAt || matter.createdAt,
										).toLocaleDateString()}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-muted-foreground">ID</span>
									<span className="font-mono text-xs">
										{matter.id.slice(0, 8)}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function PropertyRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="group flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/50">
			<span className="w-24 shrink-0 text-sm text-muted-foreground">
				{label}
			</span>
			<div className="flex-1">{children}</div>
		</div>
	);
}

function TaskTimeline({
	matterId,
	queryCtx,
	members,
	statuses,
}: {
	matterId: string;
	queryCtx: {
		sub: string;
		activeOrganizationId: string;
	};
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	members: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	statuses: any[];
}) {
	const [timeline] = useQuery(
		queries.getMatterTimelines(queryCtx, matterId),
		CACHE_NAV,
	);

	// Helper function to get status name by ID
	const getStatusName = (statusId: string | null) => {
		if (!statusId) return "Unknown";
		if (!Array.isArray(statuses) || statuses.length === 0) {
			return statusId.slice(0, 8);
		}
		const status = statuses.find((s) => s?.id === statusId);
		return status?.name || "Unknown Status";
	};

	// Helper function to get user name by ID
	const getUserName = (userId: string | null) => {
		if (!userId) return "Unassigned";
		const member = members.find((m) => m.userId === userId);
		return member?.usersTable?.name || "Unknown User";
	};

	return (
		<div className="space-y-4">
			{timeline.length === 0 ? (
				<p className="text-sm text-muted-foreground italic">No activity yet</p>
			) : (
				timeline.map((entry, index) => {
					const userName = entry.user?.name || "Unknown User";
					const userImage = entry.user?.image ?? undefined;
					const isLast = index === timeline.length - 1;

					return (
						<TimelineEntry
							key={entry.id}
							entry={entry}
							userName={userName}
							userImage={userImage}
							isLast={isLast}
							getStatusName={getStatusName}
							getUserName={getUserName}
						/>
					);
				})
			)}
		</div>
	);
}

// Memoized timeline entry for better performance
const TimelineEntry = memo(function TimelineEntry({
	entry,
	userName,
	userImage,
	isLast,
	getStatusName,
	getUserName,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	entry: any;
	userName: string;
	userImage: string | undefined;
	isLast: boolean;
	getStatusName: (statusId: string | null) => string;
	getUserName: (userId: string | null) => string;
}) {
	return (
		<div className="relative flex gap-3 group">
			{/* Timeline line */}
			{!isLast && (
				<div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-linear-to-b from-border to-transparent" />
			)}

			{/* User avatar */}
			<div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-primary/5 ring-2 ring-background shadow-sm">
				{userImage ? (
					<img
						src={userImage}
						alt={userName}
						className="size-full rounded-full object-cover"
					/>
				) : (
					<span className="text-xs font-semibold text-primary">
						{getInitials(userName)}
					</span>
				)}
			</div>

			{/* Timeline content */}
			<div className="flex-1 space-y-2 pt-0.5 pb-4">
				{/* Header with user and time */}
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-semibold text-sm text-foreground">
						{userName}
					</span>
					<span className="text-xs text-muted-foreground">
						{formatTimelineDate((entry.createdAt as number) || Date.now())}
					</span>
				</div>

				{/* Activity content */}
				<div className="rounded-lg bg-muted/30 border border-border/50 px-4 py-3 shadow-sm group-hover:border-border transition-colors">
					{entry.type === "comment" && (
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<div className="size-1 rounded-full bg-blue-500" />
								<span>Commented</span>
							</div>
							<p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
								{entry.content}
							</p>
						</div>
					)}

					{entry.type === "created" && (
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<div className="size-1 rounded-full bg-green-500" />
								<span>Created Task</span>
							</div>
							<p className="text-sm text-foreground/80">
								Created this task
								{entry.matter?.title && (
									<span className="block mt-1 font-medium text-foreground">
										"{entry.matter.title}"
									</span>
								)}
							</p>
						</div>
					)}

					{entry.type === "status_change" && (
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<div className="size-1 rounded-full bg-purple-500" />
								<span>Status Changed</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap text-sm">
								<span className="text-foreground/70">Changed status from</span>
								<span className="inline-flex items-center rounded-full bg-background border px-2.5 py-0.5 text-xs font-medium shadow-sm">
									{getStatusName(entry.fromStatusId)}
								</span>
								<span className="text-foreground/70">to</span>
								<span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-medium text-primary shadow-sm">
									{getStatusName(entry.toStatusId)}
								</span>
							</div>
						</div>
					)}

					{entry.type === "assigned" && (
						<div className="space-y-1">
							<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
								<div className="size-1 rounded-full bg-orange-500" />
								<span>Assignment Changed</span>
							</div>
							<p className="text-sm">
								<span className="text-foreground/70">Assigned to </span>
								<span className="font-semibold text-foreground">
									{getUserName(entry.toAssigneeId)}
								</span>
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

function AdminApproveSection({
	isVisible,
	isAdmin,
	matterId,
	statuses,
	z,
}: {
	isVisible: boolean;
	isAdmin: boolean;
	matterId: string;
	// biome-ignore lint/suspicious/noExplicitAny: Zero query return types are complex
	statuses: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Zero mutate types are complex
	z: any;
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isVisible || !isAdmin) return null;

	const approve = async () => {
		if (!Array.isArray(statuses) || statuses.length === 0) return;
		// Find the first "started" or "completed" status to transition to
		const next = statuses.find(
			(s) => s.type === "started" || s.type === "completed",
		);
		if (!next) return;
		try {
			setIsSubmitting(true);
			z.mutate.matter.updateStatus({
				id: matterId,
				statusId: (next as { id: string }).id,
			});
			z.mutate.matter.update({
				id: matterId,
				priority: Priority.MEDIUM,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
			<h3 className="mb-2 text-sm font-medium text-green-900 dark:text-green-100">
				Pending Approval
			</h3>
			<p className="mb-3 text-xs text-green-800 dark:text-green-200">
				This request needs your approval to proceed.
			</p>
			<Button
				onClick={approve}
				className="w-full bg-green-600 hover:bg-green-700 text-white"
				size="sm"
				disabled={isSubmitting}
			>
				<CheckCircle2 className="mr-2 size-4" />
				{isSubmitting ? "Approving..." : "Approve Request"}
			</Button>
		</div>
	);
}
