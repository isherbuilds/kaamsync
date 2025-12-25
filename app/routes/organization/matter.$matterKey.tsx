import { useQuery, useZero } from "@rocicorp/zero/react";
import { CheckCircle2, ChevronRight, MoreHorizontal, Star } from "lucide-react";
import { memo, useState } from "react";
import { useNavigate } from "react-router";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import {
	MemberSelect,
	PrioritySelect,
	StatusSelect,
} from "~/components/matter-field-selectors";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { parseMatterKey } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { formatTimelineDate, getInitials } from "~/lib/utils";
import type { Route } from "./+types/matter.$matterKey";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Matter ${params.matterKey}`,
		description: `Details and activity for matter ${params.matterKey}.`,
	},
];

const TIMELINE_TYPE_COLORS: Record<string, string> = {
	comment: "bg-blue-500",
	created: "bg-green-500",
	status_change: "bg-purple-500",
	assigned: "bg-orange-500",
};

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
	const { authSession, orgSlug } = useOrgLoaderData();
	const { parsed } = loaderData;
	const navigate = useNavigate();

	const z = useZero();

	// Load matter via synced query with workspace code + shortID
	const [matter] = useQuery(
		queries.getMatterByKey({ code: parsed.code, shortID: parsed.shortID }),
		CACHE_NAV,
	);

	// Fetch organization members and workspace statuses once
	const [members] = useQuery(queries.getOrganizationMembers(), {
		// enabled: Boolean(queryCtx.activeOrganizationId), // Zero auto-checks
		...CACHE_LONG,
	});
	const [statuses] = useQuery(
		queries.getWorkspaceStatuses({ workspaceId: matter?.workspaceId || "" }),
		{
			enabled: Boolean(matter?.workspaceId),
			...CACHE_LONG,
		},
	);

	// Determine admin privileges - direct lookup
	const userId = authSession.user.id;
	const member = members.find((m: any) => m.userId === userId);
	const isAdmin = member?.role === "admin" || member?.role === "owner";
	const canEdit =
		matter &&
		(matter.authorId === userId || matter.assigneeId === userId || isAdmin);

	// Handler functions - z is stable so no useCallback needed
	const handleStatusChange = (newStatusId: string) => {
		if (!matter) return;
		z.mutate(
			mutators.matter.updateStatus({
				id: matter.id,
				statusId: newStatusId,
			}),
		);
	};

	const handleAssign = (assigneeId: string | null) => {
		if (!matter) return;
		z.mutate(
			mutators.matter.assign({
				id: matter.id,
				assigneeId: assigneeId || null,
			}),
		);
	};

	const handlePriorityChange = (priority: PriorityValue) => {
		if (!matter) return;
		z.mutate(
			mutators.matter.update({
				id: matter.id,
				priority,
			}),
		);
	};

	const handleBack = () => {
		// window.history.state?.idx is specific to how React Router tracks history index
		if (window.history.state && window.history.state.idx > 0) {
			navigate(-1);
		} else {
			navigate(`/${orgSlug}`);
		}
	};

	// Early return after all hooks
	if (!matter) {
		return (
			<div className="flex h-screen items-center justify-center p-4">
				<div className="text-center">
					<p className="font-semibold text-lg">Task not found</p>
					<Button onClick={handleBack} className="mt-4" size="lg">
						Back
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="@container flex h-full flex-col bg-background">
			{/* Compact header - mobile optimized */}
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
						{matter.workspaceCode}-{matter.shortID}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="icon" className="size-8">
						<Star className="size-4" />
					</Button>
					<Button variant="ghost" size="icon" className="size-8">
						<MoreHorizontal className="size-4" />
					</Button>
				</div>
			</header>

			<div className="flex flex-1 @3xl:flex-row flex-col overflow-hidden">
				{/* Main Content */}
				<div className="flex-1 overflow-y-auto @3xl:pb-6 pb-20">
					<div className="mx-auto max-w-3xl @3xl:px-8 px-4 @3xl:py-8 py-4">
						<div className="@3xl:space-y-6 space-y-4">
							{/* Admin approval banner - mobile visible */}
							<AdminApproveSection
								isVisible={matter.type === "request"}
								isAdmin={isAdmin}
								matterId={matter.id}
								statuses={statuses}
								z={z}
							/>

							{/* Title */}
							<h1 className="font-bold @3xl:text-2xl text-xl">
								{matter.title}
							</h1>

							{/* Quick properties - mobile horizontal scroll */}
							<div className="-mx-4 flex @3xl:hidden gap-2 overflow-x-auto px-4 pb-2">
								<PropertyPill label="Status">
									<StatusSelect
										value={matter.statusId || ""}
										statuses={statuses}
										onChange={handleStatusChange}
										disabled={!canEdit}
										showLabel
									/>
								</PropertyPill>
								<PropertyPill label="Priority">
									<PrioritySelect
										value={(matter.priority ?? Priority.NONE) as PriorityValue}
										onChange={handlePriorityChange}
										showLabel
									/>
								</PropertyPill>
								<PropertyPill label="Assignee">
									<MemberSelect
										value={matter.assigneeId || ""}
										members={members}
										onChange={handleAssign}
										showLabel
									/>
								</PropertyPill>
							</div>

							{/* Description */}
							{matter.description ? (
								<p className="whitespace-pre-wrap text-foreground/80 text-sm leading-relaxed">
									{matter.description}
								</p>
							) : (
								<p className="text-muted-foreground text-sm italic">
									No description
								</p>
							)}

							<Separator />

							{/* Activity */}
							<div className="space-y-4">
								<h2 className="font-semibold text-sm">Activity</h2>
								<CommentInput />
								<TaskTimeline
									matterId={matter.id}
									members={members}
									statuses={statuses}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Desktop Sidebar */}
				<aside className="@3xl:block hidden w-72 shrink-0 overflow-y-auto border-l bg-muted/5 p-4">
					<div className="space-y-6">
						<AdminApproveSection
							isVisible={matter.type === "request"}
							isAdmin={isAdmin}
							matterId={matter.id}
							statuses={statuses}
							z={z}
						/>

						<div className="space-y-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Properties
							</h3>
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
								<MemberSelect
									value={matter.assigneeId || ""}
									members={members}
									onChange={handleAssign}
									showLabel
									className="h-7 w-full justify-start px-2"
								/>
							</PropertyRow>
						</div>

						<Separator />

						<div className="space-y-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Labels
							</h3>
							{matter.type === "request" ? (
								<span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-50 px-2 py-0.5 font-medium text-xs text-yellow-700 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-400">
									Request
								</span>
							) : (
								<span className="text-muted-foreground/50 text-sm italic">
									None
								</span>
							)}
						</div>

						<Separator />

						<div className="space-y-2 text-muted-foreground text-xs">
							<h3 className="font-medium">Details</h3>
							<div className="flex justify-between">
								<span>Created</span>
								<span>{new Date(matter.createdAt).toLocaleDateString()}</span>
							</div>
							<div className="flex justify-between">
								<span>Updated</span>
								<span>
									{new Date(
										matter.updatedAt || matter.createdAt,
									).toLocaleDateString()}
								</span>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}

// Mobile property pill - horizontal scrollable
function PropertyPill({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5">
			<span className="text-muted-foreground text-xs">{label}</span>
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
		<div className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/50">
			<span className="w-20 shrink-0 text-muted-foreground text-sm">
				{label}
			</span>
			<div className="flex-1">{children}</div>
		</div>
	);
}

// Simplified comment input
function CommentInput() {
	return (
		<form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
			<Textarea
				placeholder="Add a comment..."
				rows={2}
				className="min-h-15 resize-none text-sm"
			/>
			<Button type="submit" size="sm" className="shrink-0 self-end">
				Send
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
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	members: any[];
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	statuses: any[];
}) {
	const [timeline] = useQuery(
		queries.getMatterTimelines({ matterId }),
		CACHE_NAV,
	);

	// Build lookup maps once - O(n) setup, O(1) lookup
	const statusMap = new Map<string, string>();
	for (let i = 0; i < statuses.length; i++) {
		const s = statuses[i];
		if (s?.id) statusMap.set(s.id, s.name || "Unknown Status");
	}

	const memberMap = new Map<string, string>();
	for (let i = 0; i < members.length; i++) {
		const m = members[i];
		if (m?.userId)
			memberMap.set(m.userId, m.usersTable?.name || "Unknown User");
	}

	if (timeline.length === 0) {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm italic">No activity yet</p>
			</div>
		);
	}

	const timelineLength = timeline.length;
	return (
		<div className="space-y-4">
			{timeline.map((entry, index) => {
				const userName = entry.user?.name || "Unknown User";
				const userImage = entry.user?.image ?? undefined;

				return (
					<TimelineEntry
						key={entry.id}
						entry={entry}
						userName={userName}
						userImage={userImage}
						isLast={index === timelineLength - 1}
						statusMap={statusMap}
						memberMap={memberMap}
					/>
				);
			})}
		</div>
	);
}

// Memoized timeline entry - simplified for mobile
const TimelineEntry = memo(function TimelineEntry({
	entry,
	userName,
	userImage,
	isLast,
	statusMap,
	memberMap,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	entry: any;
	userName: string;
	userImage: string | undefined;
	isLast: boolean;
	statusMap: Map<string, string>;
	memberMap: Map<string, string>;
}) {
	// Inline lookup using maps
	const getStatusName = (statusId: string | null) =>
		statusId ? statusMap.get(statusId) || statusId.slice(0, 8) : "Unknown";
	const getUserName = (userId: string | null) =>
		userId ? memberMap.get(userId) || "Unknown User" : "Unassigned";
	let content: React.ReactNode = null;
	if (entry.type === "comment") {
		content = <p className="whitespace-pre-wrap text-sm">{entry.content}</p>;
	} else if (entry.type === "created") {
		content = <p className="text-sm">Created this task</p>;
	} else if (entry.type === "status_change") {
		content = (
			<p className="text-sm">
				Status:{" "}
				<span className="font-medium">{getStatusName(entry.fromStatusId)}</span>
				{" → "}
				<span className="font-medium text-primary">
					{getStatusName(entry.toStatusId)}
				</span>
			</p>
		);
	} else if (entry.type === "assigned") {
		content = (
			<p className="text-sm">
				Assigned to{" "}
				<span className="font-medium">{getUserName(entry.toAssigneeId)}</span>
			</p>
		);
	}

	return (
		<div className="relative flex gap-3">
			{!isLast && (
				<div className="absolute top-8 bottom-0 left-3.75 w-px bg-border" />
			)}
			<div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
				{userImage ? (
					<img
						src={userImage}
						alt={userName}
						className="size-full rounded-full object-cover"
					/>
				) : (
					<span className="font-semibold text-[10px]">
						{getInitials(userName)}
					</span>
				)}
			</div>
			<div className="flex-1 pb-4">
				<div className="mb-1 flex items-center gap-2">
					<span className="font-medium text-sm">{userName}</span>
					<div
						className={`size-1 rounded-full ${TIMELINE_TYPE_COLORS[entry.type] || "bg-muted"}`}
					/>
					<span className="text-muted-foreground text-xs">
						{formatTimelineDate(entry.createdAt || Date.now())}
					</span>
				</div>
				<div className="rounded-md border bg-muted/30 px-3 py-2">{content}</div>
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
			z.mutate(
				mutators.matter.updateStatus({
					id: matterId,
					statusId: (next as { id: string }).id,
				}),
			);
			z.mutate(
				mutators.matter.update({
					id: matterId,
					priority: Priority.MEDIUM,
				}),
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
			<h3 className="mb-2 font-medium text-green-900 text-sm dark:text-green-100">
				Pending Approval
			</h3>
			<p className="mb-3 text-green-800 text-xs dark:text-green-200">
				This request needs your approval to proceed.
			</p>
			<Button
				onClick={approve}
				className="w-full bg-green-600 text-white hover:bg-green-700"
				size="sm"
				disabled={isSubmitting}
			>
				<CheckCircle2 className="mr-2 size-4" />
				{isSubmitting ? "Approving..." : "Approve Request"}
			</Button>
		</div>
	);
}
