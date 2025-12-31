import type { Row } from "@rocicorp/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
	Archive,
	ArchiveRestore,
	CheckCircle2,
	ChevronRight,
	MoreHorizontal,
	Star,
	Trash2,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import {
	MemberSelect,
	type MemberSelectorItem,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter-field-selectors";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { parseMatterKey } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { usePermissions } from "~/hooks/use-permissions";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { cn, formatTimelineDate, getInitials } from "~/lib/utils";
import type { Route } from "./+types/matter.$matterKey";

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Matter ${params.matterKey}` },
	{
		name: "description",
		content: `Details and activity for matter ${params.matterKey}.`,
	},
];

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const matterKey = params.matterKey;
	if (!matterKey) throw new Response("Not Found", { status: 404 });
	const parsed = parseMatterKey(matterKey);
	if (!parsed) throw new Response("Invalid matter key format", { status: 400 });
	return { matterKey, parsed };
}

export default function TaskDetailPage({ loaderData }: Route.ComponentProps) {
	const { orgSlug } = useOrgLoaderData();
	const { parsed } = loaderData;
	const navigate = useNavigate();
	const z = useZero();

	// 1. Data Fetching
	const [matter] = useQuery(
		queries.getMatterByKey({ code: parsed.code, shortID: parsed.shortID }),
		CACHE_NAV,
	);

	// Inferred types from Zero queries
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [teamMemberships] = useQuery(
		queries.getTeamMembers({ teamId: matter?.teamId || "" }),
		{ enabled: !!matter?.teamId, ...CACHE_LONG },
	);
	const [statuses] = useQuery(
		queries.getTeamStatuses({ teamId: matter?.teamId || "" }),
		{ enabled: !!matter?.teamId, ...CACHE_LONG },
	);

	// 2. Permissions
	const perms = usePermissions(matter?.teamId, teamMemberships);
	// Org-level elevation: managers in team or owners/admins in org have full access
	const authRole = perms.role as string;
	const isAdmin =
		perms.isManager || authRole === "admin" || authRole === "owner";
	const canEdit = matter
		? perms.canEditMatter(matter.authorId, matter.assigneeId) || isAdmin
		: false;

	// Filter statuses based on matter type (task vs request)
	const filteredStatuses = useMemo(() => {
		if (!matter) return statuses;
		// Requests use request statuses, tasks use task statuses
		const isRequest = matter.type === "request";
		return statuses.filter((s) => {
			const isRequestStatus =
				s.type === "pending_approval" || s.type === "rejected";
			return isRequest ? isRequestStatus : !isRequestStatus;
		});
	}, [matter, statuses]);

	// 3. State & Loading
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isUpdating, setIsUpdating] = useState({
		status: false,
		priority: false,
		assignee: false,
	});

	const handleStatusChange = (s: string) => {
		if (!matter) return;
		setIsUpdating((prev) => ({ ...prev, status: true }));
		z.mutate(
			mutators.matter.updateStatus({ id: matter.id, statusId: s }),
		).server.finally(() =>
			setIsUpdating((prev) => ({ ...prev, status: false })),
		);
	};

	const handleAssign = (u: string | null) => {
		if (!matter) return;
		setIsUpdating((prev) => ({ ...prev, assignee: true }));
		z.mutate(
			mutators.matter.assign({ id: matter.id, assigneeId: u }),
		).server.finally(() =>
			setIsUpdating((prev) => ({ ...prev, assignee: false })),
		);
	};

	const handlePriorityChange = (p: PriorityValue) => {
		if (!matter) return;
		setIsUpdating((prev) => ({ ...prev, priority: true }));
		z.mutate(
			mutators.matter.update({ id: matter.id, priority: p }),
		).server.finally(() =>
			setIsUpdating((prev) => ({ ...prev, priority: false })),
		);
	};

	const handleArchive = () => {
		if (!matter) return;
		if (matter.archived) {
			z.mutate(mutators.matter.unarchive({ id: matter.id }))
				.server.then(() => toast.success("Matter unarchived"))
				.catch(() => toast.error("Failed to unarchive matter"));
		} else {
			z.mutate(mutators.matter.archive({ id: matter.id }))
				.server.then(() => toast.success("Matter archived"))
				.catch(() => toast.error("Failed to archive matter"));
		}
	};

	const handleDelete = () => {
		if (!matter) return;
		z.mutate(mutators.matter.delete({ id: matter.id }))
			.server.then(() => {
				toast.success("Matter deleted");
				navigate(`/${orgSlug}`);
			})
			.catch(() => toast.error("Failed to delete matter"));
	};

	const handleBack = () => {
		if (window.history.state && window.history.state.idx > 0) navigate(-1);
		else navigate(`/${orgSlug}`);
	};

	if (!matter) {
		return (
			<div className="flex h-full flex-col bg-background">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
					<div className="h-4 w-16 animate-pulse rounded bg-muted" />
					<div className="h-4 w-24 animate-pulse rounded bg-muted" />
				</header>
				<div className="flex-1 p-8">
					<div className="mx-auto max-w-3xl space-y-6">
						<div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
						<div className="space-y-2">
							<div className="h-4 w-full animate-pulse rounded bg-muted" />
							<div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
							<div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="@container flex h-full flex-col bg-background">
			<header className="flex h-12 shrink-0 items-center justify-between border-b px-3 md:px-4">
				<div className="flex min-w-0 items-center gap-2 text-muted-foreground">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 px-2"
						onClick={handleBack}
					>
						<ChevronRight className="size-4 rotate-180" />
						<span className="ml-1 hidden sm:inline">Back</span>
					</Button>
					<span className="truncate font-medium font-mono text-foreground text-sm">
						{matter.teamCode}-{matter.shortID}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-8">
						<Star className="size-4" />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="size-8">
								<MoreHorizontal className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem onClick={handleArchive}>
								{matter.archived ? (
									<>
										<ArchiveRestore className="mr-2 size-4" /> Unarchive
									</>
								) : (
									<>
										<Archive className="mr-2 size-4" /> Archive
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-950"
								onClick={() => setIsDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 size-4" /> Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			<div className="flex flex-1 @3xl:flex-row flex-col overflow-hidden">
				<main className="flex-1 overflow-y-auto @3xl:pb-6 pb-20">
					<div className="mx-auto max-w-3xl @3xl:px-8 px-4 @3xl:py-8 py-4">
						<div className="@3xl:space-y-6 space-y-4">
							{matter.archived && (
								<div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 sm:px-4 dark:border-amber-900/30 dark:bg-amber-950/10">
									<div className="flex items-center gap-2">
										<Archive className="size-4 text-amber-600" />
										<span className="text-amber-900 text-sm dark:text-amber-100">
											This matter is archived.
										</span>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/50"
										onClick={handleArchive}
									>
										Unarchive
									</Button>
								</div>
							)}

							<AdminApproveSection
								isVisible={matter.type === "request"}
								isAdmin={isAdmin}
								matterId={matter.id}
								statusType={matter.status?.type}
								z={z}
							/>

							<h1 className="font-bold @3xl:text-2xl text-xl">
								{matter.title}
							</h1>

							{/* Mobile Properties Row */}
							<div className="-mx-4 flex @3xl:hidden gap-2 overflow-x-auto px-4 pb-2">
								{/* Hide status selector for requests - they use approval flow */}
								{matter.type !== "request" && (
									<PropertyPill label="Status">
										<StatusSelect
											value={matter.statusId}
											statuses={filteredStatuses}
											onChange={handleStatusChange}
											disabled={!canEdit || isUpdating.status}
											showLabel
										/>
									</PropertyPill>
								)}
								<PropertyPill label="Priority">
									<PrioritySelect
										value={
											Number(matter.priority ?? Priority.NONE) as PriorityValue
										}
										onChange={handlePriorityChange}
										disabled={!canEdit || isUpdating.priority}
										showLabel
									/>
								</PropertyPill>
								<PropertyPill label="Assignee">
									<MemberSelect
										value={matter.assigneeId}
										members={members as readonly MemberSelectorItem[]}
										onChange={handleAssign}
										disabled={!canEdit || isUpdating.assignee}
										showLabel
									/>
								</PropertyPill>
							</div>

							<div className="whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
								{matter.description || (
									<span className="text-muted-foreground italic">
										No description
									</span>
								)}
							</div>

							<Separator />

							<div className="space-y-4">
								<h2 className="font-semibold text-sm">Activity</h2>
								<CommentInput matterId={matter.id} />
								<TaskTimeline
									matterId={matter.id}
									members={members}
									statuses={statuses}
								/>
							</div>
						</div>
					</div>
				</main>

				{/* Desktop Sidebar */}
				<aside className="@3xl:block hidden w-72 shrink-0 overflow-y-auto border-l bg-muted/5 p-4">
					<div className="space-y-6">
						<div className="space-y-2">
							<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
								Properties
							</h3>
							{/* Hide status selector for requests - they use approval flow */}
							{matter.type !== "request" && (
								<PropertyRow label="Status">
									<StatusSelect
										value={matter.statusId}
										statuses={filteredStatuses}
										onChange={handleStatusChange}
										disabled={!canEdit || isUpdating.status}
										showLabel
										className="h-8 w-full justify-start border bg-background px-2"
									/>
								</PropertyRow>
							)}
							<PropertyRow label="Priority">
								<PrioritySelect
									value={
										Number(matter.priority ?? Priority.NONE) as PriorityValue
									}
									onChange={handlePriorityChange}
									disabled={!canEdit || isUpdating.priority}
									showLabel
									className="h-8 w-full justify-start border bg-background px-2"
								/>
							</PropertyRow>
							<PropertyRow label="Assignee">
								<MemberSelect
									value={matter.assigneeId}
									members={members as readonly MemberSelectorItem[]}
									onChange={handleAssign}
									disabled={!canEdit || isUpdating.assignee}
									showLabel
									className="h-8 w-full justify-start border bg-background px-2"
								/>
							</PropertyRow>
						</div>

						<Separator />

						<div className="space-y-2 text-xs">
							<h3 className="font-medium text-muted-foreground uppercase tracking-wider">
								Details
							</h3>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Created</span>
								<span className="text-foreground">
									{new Date(matter.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Updated</span>
								<span className="text-foreground">
									{new Date(
										matter.updatedAt || matter.createdAt,
									).toLocaleDateString()}
								</span>
							</div>
						</div>
					</div>
				</aside>
			</div>

			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Matter</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete {matter.teamCode}-{matter.shortID}
							? This action cannot be easily undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button
							variant="ghost"
							onClick={() => setIsDeleteDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDelete}>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// --- Internal Helper Components ---

function PropertyPill({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/50 px-3 py-1">
			<span className="font-bold text-[10px] text-muted-foreground uppercase tracking-tight">
				{label}
			</span>
			{children}
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
		<div className="space-y-1">
			<span className="ml-1 font-medium text-[11px] text-muted-foreground">
				{label}
			</span>
			<div className="flex-1">{children}</div>
		</div>
	);
}

function CommentInput({ matterId }: { matterId: string }) {
	const z = useZero();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Sanitize comment: trim, collapse whitespace, enforce max length
	const sanitizeComment = (text: string) => {
		return text.trim().slice(0, 5000);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const sanitized = sanitizeComment(content);
		if (!sanitized || isSubmitting) return;

		setIsSubmitting(true);
		z.mutate(mutators.timeline.addComment({ matterId, content: sanitized }))
			.server.then(() => {
				setContent("");
				toast.success("Comment added");
			})
			.catch((err) => {
				toast.error("Failed to add comment");
				console.error("Comment mutation failed:", err);
			})
			.finally(() => setIsSubmitting(false));
	};

	// Support Cmd/Ctrl+Enter to submit
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Add a comment... (⌘+Enter to submit)"
				rows={2}
				className="min-h-15 resize-none text-sm"
				disabled={isSubmitting}
			/>
			<Button
				type="submit"
				size="sm"
				className="shrink-0 self-end"
				disabled={!content.trim() || isSubmitting}
			>
				{isSubmitting ? "..." : "Send"}
			</Button>
		</form>
	);
}

function TaskTimeline({
	matterId,
	members,
	statuses,
}: {
	matterId: string;
	members: readonly any[];
	statuses: readonly Row["statusesTable"][];
}) {
	const [timeline] = useQuery(
		queries.getMatterTimelines({ matterId }),
		CACHE_NAV,
	);

	const statusMap = useMemo(
		() => new Map(statuses.map((s) => [s.id, s.name || "Status"])),
		[statuses],
	);
	const memberMap = useMemo(
		() =>
			new Map(
				members.map((m) => [
					m.userId,
					m.usersTable?.name || m.user?.name || "User",
				]),
			),
		[members],
	);

	if (timeline.length === 0)
		return (
			<p className="text-muted-foreground text-sm italic">No activity yet</p>
		);

	return (
		<div className="space-y-4">
			{timeline.map((entry, index) => (
				<TimelineEntry
					key={entry.id}
					entry={entry}
					isLast={index === timeline.length - 1}
					statusMap={statusMap}
					memberMap={memberMap}
				/>
			))}
		</div>
	);
}

const TimelineEntry = memo(function TimelineEntry({
	entry,
	isLast,
	statusMap,
	memberMap,
}: {
	entry: any;
	isLast: boolean;
	statusMap: Map<string, string>;
	memberMap: Map<string, string>;
}) {
	const userName = entry.user?.name || "User";
	const userImage = entry.user?.image;

	const getStatusName = (id: string | null) =>
		id ? statusMap.get(id) || "Status" : "Unknown";
	const getUserName = (id: string | null) =>
		id ? memberMap.get(id) || "User" : "Unassigned";

	let content: React.ReactNode = null;
	if (entry.type === "comment")
		content = <p className="text-sm">{entry.content}</p>;
	else if (entry.type === "created")
		content = (
			<p className="text-muted-foreground text-sm">created this task</p>
		);
	else if (entry.type === "status_change")
		content = (
			<p className="text-muted-foreground text-sm">
				changed status from{" "}
				<span className="font-medium text-foreground">
					{getStatusName(entry.fromStatusId)}
				</span>{" "}
				to{" "}
				<span className="font-medium text-primary">
					{getStatusName(entry.toStatusId)}
				</span>
			</p>
		);
	else if (entry.type === "assigned")
		content = (
			<p className="text-muted-foreground text-sm">
				assigned this to{" "}
				<span className="font-medium text-foreground">
					{getUserName(entry.toAssigneeId)}
				</span>
			</p>
		);

	return (
		<div className="relative flex gap-3">
			{!isLast && (
				<div className="absolute top-8 bottom-0 left-3.75 w-px bg-border" />
			)}
			<div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
				{userImage ? (
					<img
						src={userImage}
						alt=""
						className="size-full rounded-full object-cover"
					/>
				) : (
					<span className="font-bold text-[10px]">{getInitials(userName)}</span>
				)}
			</div>
			<div className="flex-1 pb-4">
				<div className="mb-1 flex items-center gap-2">
					<span className="font-semibold text-sm">{userName}</span>
					<span className="text-muted-foreground text-xs">
						{formatTimelineDate(entry.createdAt)}
					</span>
				</div>
				<div
					className={cn(
						"rounded-md border bg-muted/20 px-3 py-2",
						entry.type === "comment" && "bg-background shadow-sm",
					)}
				>
					{content}
				</div>
			</div>
		</div>
	);
});

function AdminApproveSection({
	isVisible,
	isAdmin,
	matterId,
	statusType,
	z,
}: {
	isVisible: boolean;
	isAdmin: boolean;
	matterId: string;
	statusType?: string | null;
	z: any;
}) {
	if (!isVisible || !isAdmin) return null;

	const handleApprove = () => {
		z.mutate(mutators.matter.approve({ id: matterId }))
			.server.then(() => toast.success("Request approved"))
			.catch(() => toast.error("Failed to approve request"));
	};

	const handleReject = () => {
		z.mutate(mutators.matter.reject({ id: matterId }))
			.server.then(() => toast.success("Request rejected"))
			.catch(() => toast.error("Failed to reject request"));
	};

	if (statusType === "rejected") {
		return (
			<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
				<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
					<div className="space-y-1">
						<h3 className="font-bold text-destructive text-sm">
							Request Rejected
						</h3>
						<p className="text-destructive/70 text-xs">
							This request was rejected. You can still approve it if needed.
						</p>
					</div>
					<Button
						onClick={handleApprove}
						size="sm"
						className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
					>
						<CheckCircle2 className="mr-2 size-4" /> Approve Anyway
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/10">
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="space-y-1">
					<h3 className="font-bold text-amber-900 text-sm dark:text-amber-100">
						Pending Approval
					</h3>
					<p className="text-amber-800/80 text-xs dark:text-amber-400">
						Review this request to convert it into an active task.
					</p>
				</div>
				<div className="flex w-full gap-2 sm:w-auto">
					<Button
						onClick={handleReject}
						size="sm"
						variant="outline"
						className="flex-1 border-red-300 text-red-600 hover:bg-red-50 sm:flex-none dark:border-red-800 dark:text-red-400"
					>
						Reject
					</Button>
					<Button
						onClick={handleApprove}
						size="sm"
						className="flex-1 bg-green-600 text-white hover:bg-green-700 sm:flex-none"
					>
						<CheckCircle2 className="mr-2 size-4" /> Approve
					</Button>
				</div>
			</div>
		</div>
	);
}
