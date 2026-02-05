import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import ArrowRightIcon from "lucide-react/dist/esm/icons/arrow-right";
import CheckCircleIcon from "lucide-react/dist/esm/icons/check-circle";
import FlagIcon from "lucide-react/dist/esm/icons/flag";
import MessageSquareIcon from "lucide-react/dist/esm/icons/message-square";
import UserIcon from "lucide-react/dist/esm/icons/user";
import XCircleIcon from "lucide-react/dist/esm/icons/x-circle";
import { Suspense, lazy, memo, useMemo } from "react";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import type { AttachmentItem } from "~/components/attachments/attachment-preview-list";
import { cn, extractNameInitials, formatActivityTimestamp } from "~/lib/utils";
import type { MemberSelectorItem } from "./matter-field-selectors";

const AttachmentPreviewList = lazy(() =>
	import("~/components/attachments/attachment-preview-list").then((mod) => ({
		default: mod.AttachmentPreviewList,
	})),
);

// ============================================================================
// Types
// ============================================================================

type TimelineEntry = Row["timelinesTable"] & {
	user?: { name: string; image?: string | null };
};

type StatusLookup = Map<string, string>;
type MemberLookup = Map<string, string>;
type AttachmentLookup = Map<string, AttachmentItem[]>;

interface MatterActivityTimelineProps {
	matterId: string;
	members: readonly MemberSelectorItem[];
	statuses: readonly Row["statusesTable"][];
}

interface ActivityEntryItemProps {
	entryType: string;
	entryContent: string | null | undefined;
	entryCreatedAt: number;
	entryFromStatusId: string | null | undefined;
	entryToStatusId: string | null | undefined;
	entryFromAssigneeId: string | null | undefined;
	entryToAssigneeId: string | null | undefined;
	entryFromValue: string | null | undefined;
	entryToValue: string | null | undefined;
	authorName: string;
	authorAvatar: string | null | undefined;
	isLastEntry: boolean;
	statusLookup: StatusLookup;
	memberLookup: MemberLookup;
	attachments: AttachmentItem[];
	showMeta?: boolean;
	isGroupContinuation?: boolean;
}

// ============================================================================
// Lookup Helpers
// ============================================================================

function resolveStatusName(id: string | null, lookup: StatusLookup): string {
	return id ? lookup.get(id) || "Status" : "Unknown";
}

function resolveMemberName(id: string | null, lookup: MemberLookup): string {
	return id ? lookup.get(id) || "User" : "Unassigned";
}

// ============================================================================
// Icons & Styles (static maps for smaller bundle)
// ============================================================================

const EVENT_ICONS: Record<string, typeof UserIcon> = {
	comment: MessageSquareIcon,
	status_change: ArrowRightIcon,
	assigned: UserIcon,
	assignment: UserIcon,
	priority_change: FlagIcon,
	approval: CheckCircleIcon,
	rejection: XCircleIcon,
	archive: XCircleIcon,
	restore: CheckCircleIcon,
};

const EVENT_COLORS: Record<string, string> = {
	comment: "bg-primary/10 text-primary",
	approval: "bg-emerald-500/10 text-emerald-600",
	rejection: "bg-red-500/10 text-red-600",
	priority_change: "bg-orange-500/10 text-orange-600",
	archive: "bg-muted text-muted-foreground",
	restore: "bg-emerald-500/10 text-emerald-600",
};

const DEFAULT_ICON = UserIcon;
const DEFAULT_COLOR = "bg-muted text-muted-foreground";

// ============================================================================
// Activity Entry Item Component
// ============================================================================

const ActivityEntryItem = memo(function ActivityEntryItem({
	entryType,
	entryContent,
	entryCreatedAt,
	entryFromStatusId,
	entryToStatusId,
	entryFromAssigneeId,
	entryToAssigneeId,
	entryFromValue,
	entryToValue,
	authorName,
	authorAvatar,
	isLastEntry,
	statusLookup,
	memberLookup,
	attachments,
	showMeta = true,
	isGroupContinuation = false,
}: ActivityEntryItemProps) {
	const isComment = entryType === "comment";
	const Icon = EVENT_ICONS[entryType] ?? DEFAULT_ICON;
	const iconColor = EVENT_COLORS[entryType] ?? DEFAULT_COLOR;

	const content = useMemo(() => {
		switch (entryType) {
			case "comment":
				return (
					<div className="text-foreground/90 text-sm leading-relaxed sm:text-base">
						{entryContent}
					</div>
				);

			case "created":
				return (
					<p className="text-muted-foreground text-sm">created this matter</p>
				);

			case "status_change":
				return (
					<div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm">
						<span>changed status from</span>
						<span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground text-xs">
							{resolveStatusName(entryFromStatusId ?? null, statusLookup)}
						</span>
						<ArrowRightIcon className="size-3 text-muted-foreground/50" />
						<span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
							{resolveStatusName(entryToStatusId ?? null, statusLookup)}
						</span>
					</div>
				);

			case "assigned":
			case "assignment": {
				const toName = resolveMemberName(
					entryToAssigneeId ?? null,
					memberLookup,
				);
				const fromName = resolveMemberName(
					entryFromAssigneeId ?? null,
					memberLookup,
				);

				if (!entryToAssigneeId) {
					return (
						<p className="text-muted-foreground text-sm">
							unassigned{" "}
							<span className="font-medium text-foreground">{fromName}</span>
						</p>
					);
				}
				if (!entryFromAssigneeId) {
					return (
						<p className="text-muted-foreground text-sm">
							assigned to{" "}
							<span className="font-medium text-foreground">{toName}</span>
						</p>
					);
				}
				return (
					<div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm">
						<span>reassigned</span>
						<span className="font-medium text-foreground">{fromName}</span>
						<ArrowRightIcon className="size-3 text-muted-foreground/50" />
						<span className="font-medium text-foreground">{toName}</span>
					</div>
				);
			}

			case "priority_change": {
				const priorityLabels: Record<string, string> = {
					"0": "Urgent",
					"1": "High",
					"2": "Medium",
					"3": "Low",
					"4": "None",
				};
				const fromPriority = priorityLabels[entryFromValue ?? "4"] ?? "None";
				const toPriority = priorityLabels[entryToValue ?? "4"] ?? "None";
				return (
					<div className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm">
						<span>changed priority from</span>
						<span className="font-medium text-foreground">{fromPriority}</span>
						<ArrowRightIcon className="size-3 text-muted-foreground/50" />
						<span className="font-medium text-foreground">{toPriority}</span>
					</div>
				);
			}

			case "approval":
				return (
					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground text-sm">
							<span className="font-medium text-emerald-600">approved</span>{" "}
							this request
						</p>
						{entryContent && (
							<div className="border-emerald-500/20 border-l-2 pl-3">
								<p className="text-muted-foreground text-sm italic">
									&ldquo;{entryContent}&rdquo;
								</p>
							</div>
						)}
					</div>
				);

			case "rejection":
				return (
					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground text-sm">
							<span className="font-medium text-destructive">rejected</span>{" "}
							this request
						</p>
						{entryContent && (
							<div className="border-destructive/20 border-l-2 pl-3">
								<p className="text-muted-foreground text-sm italic">
									&ldquo;{entryContent}&rdquo;
								</p>
							</div>
						)}
					</div>
				);

			case "archive":
				return (
					<p className="text-muted-foreground text-sm">
						<span className="font-medium text-foreground">archived</span> this
						matter
					</p>
				);

			case "restore":
				return (
					<p className="text-muted-foreground text-sm">
						<span className="font-medium text-foreground">restored</span> this
						matter
					</p>
				);

			default:
				return (
					<p className="text-muted-foreground text-sm italic">
						Unknown activity type
					</p>
				);
		}
	}, [
		entryType,
		entryContent,
		entryFromStatusId,
		entryToStatusId,
		entryFromAssigneeId,
		entryToAssigneeId,
		entryFromValue,
		entryToValue,
		statusLookup,
		memberLookup,
	]);

	const formattedTime = useMemo(
		() => formatActivityTimestamp(entryCreatedAt),
		[entryCreatedAt],
	);

	return (
		<div className="group relative flex gap-3 sm:gap-4">
			{!isLastEntry && (
				<div className="absolute top-8 bottom-0 left-[15px] w-px bg-border transition-colors group-hover:bg-muted-foreground/30 sm:left-[19px]" />
			)}

			<div className="flex flex-col items-center">
				{isComment ? (
					<div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-background sm:size-10">
						{authorAvatar ? (
							<img
								src={authorAvatar}
								alt={authorName}
								loading="lazy"
								width={40}
								height={40}
								className="size-full rounded-full object-cover shadow-sm"
							/>
						) : (
							<div className="flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground">
								<span className="font-semibold text-xs">
									{extractNameInitials(authorName)}
								</span>
							</div>
						)}
					</div>
				) : (
					<div
						className={cn(
							"relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background sm:size-10",
							iconColor,
						)}
					>
						<Icon className="size-4 sm:size-5" />
					</div>
				)}
			</div>

			<div
				className={cn(
					"flex-1 pb-4 sm:pb-6",
					isGroupContinuation && "pb-2 sm:pb-3",
				)}
			>
				{showMeta && (
					<div className="mb-1 flex items-center gap-2">
						<span className="font-medium text-foreground text-sm sm:text-base">
							{authorName}
						</span>
						<span className="text-muted-foreground text-xs">
							{formattedTime}
						</span>
					</div>
				)}

				{isComment ? (
					<div className="mt-1">
						{entryContent && entryContent.trim().length > 0 && (
							<div className="rounded-r-lg rounded-bl-lg border bg-card px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
								{content}
							</div>
						)}
						{attachments.length > 0 && (
							<Suspense
								fallback={
									<div className="mt-2 h-16 animate-pulse rounded bg-muted/50" />
								}
							>
								<AttachmentPreviewList
									compact
									className={cn(
										"mt-2",
										(!entryContent || entryContent.trim().length === 0) &&
											"mt-1",
									)}
									attachments={attachments}
								/>
							</Suspense>
						)}
					</div>
				) : (
					<div className="mt-0.5">{content}</div>
				)}
			</div>
		</div>
	);
});

// ============================================================================
// Main Component
// ============================================================================

export function MatterActivityTimeline({
	matterId,
	members,
	statuses,
}: MatterActivityTimelineProps) {
	const [timelineEntries] = useQuery(
		queries.getMatterTimelines({ matterId }),
		CACHE_NAV,
	);

	const commentIds = useMemo(
		() =>
			timelineEntries
				.filter((e) => e.type === "comment")
				.map((e) => e.id),
		[timelineEntries],
	);

	const [commentAttachments] = useQuery(
		queries.getCommentAttachmentsBatch({
			commentIds: commentIds.length > 0 ? commentIds : [],
		}),
		{ ...CACHE_NAV, enabled: commentIds.length > 0 },
	);

	const attachmentLookup = useMemo<AttachmentLookup>(() => {
		const map = new Map<string, AttachmentItem[]>();
		for (const att of commentAttachments) {
			if (att.subjectId) {
				const list = map.get(att.subjectId) ?? [];
				list.push({
					id: att.id,
					fileName: att.fileName,
					fileType: att.fileType,
					fileSize: att.fileSize,
					storageKey: att.storageKey,
					publicUrl: att.publicUrl,
				});
				map.set(att.subjectId, list);
			}
		}
		return map;
	}, [commentAttachments]);

	const { filteredEntries, groups } = useMemo(() => {
		const filtered: TimelineEntry[] = [];
		const grps: Array<{ entries: TimelineEntry[]; authorId: string }> = [];
		let currentGroup: TimelineEntry[] = [];
		let currentAuthorId = "";

		for (const entry of timelineEntries) {
			if (entry.type === "assignment" || entry.type === "assigned") {
				if (entry.fromAssigneeId === entry.toAssigneeId) continue;
			} else if (entry.type === "status_change") {
				if (entry.fromStatusId === entry.toStatusId) continue;
			} else if (entry.type === "priority_change") {
				if (entry.fromValue === entry.toValue) continue;
			}

			filtered.push(entry);

			const entryUserId = entry.userId;
			const isComment = entry.type === "comment";
			const prevIsComment =
				currentGroup.length > 0 && currentGroup[0].type === "comment";

			if (
				currentGroup.length > 0 &&
				!isComment &&
				!prevIsComment &&
				entryUserId === currentAuthorId
			) {
				currentGroup.push(entry);
			} else {
				if (currentGroup.length > 0) {
					grps.push({ entries: currentGroup, authorId: currentAuthorId });
				}
				currentGroup = [entry];
				currentAuthorId = entryUserId;
			}
		}

		if (currentGroup.length > 0) {
			grps.push({ entries: currentGroup, authorId: currentAuthorId });
		}

		return { filteredEntries: filtered, groups: grps };
	}, [timelineEntries]);

	const statusLookup = useMemo<StatusLookup>(
		() => new Map(statuses.map((s) => [s.id, s.name || "Status"])),
		[statuses],
	);

	const memberLookup = useMemo<MemberLookup>(
		() =>
			new Map(
				members.map((m) => [
					m.userId,
					m.usersTable?.name || m.user?.name || "User",
				]),
			),
		[members],
	);

	if (filteredEntries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 py-12 text-center">
				<div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/40">
					<MessageSquareIcon className="size-6 text-muted-foreground" />
				</div>
				<p className="font-medium text-muted-foreground text-sm sm:text-base">
					No activity yet
				</p>
				<p className="text-muted-foreground/70 text-xs sm:text-sm">
					Start the conversation or update the matter
				</p>
			</div>
		);
	}

	let entryIndex = 0;
	const totalEntries = filteredEntries.length;

	return (
		<div className="pl-1">
			{groups.map((group, groupIndex) => (
				<div
					key={group.entries[0]?.id ?? groupIndex}
					className={cn("space-y-1", groupIndex > 0 && "pt-1")}
				>
					{group.entries.map((entry, idx) => {
						const isLastEntry = entryIndex === totalEntries - 1;
						entryIndex++;
						const showMeta = idx === 0;
						const isGroupContinuation = idx > 0;
						const authorName = entry.user?.name || "User";
						const authorAvatar = entry.user?.image;
						const attachments = attachmentLookup.get(entry.id) ?? [];

						return (
							<ActivityEntryItem
								key={entry.id}
								entryType={entry.type}
								entryContent={entry.content}
								entryCreatedAt={entry.createdAt}
								entryFromStatusId={entry.fromStatusId}
								entryToStatusId={entry.toStatusId}
								entryFromAssigneeId={entry.fromAssigneeId}
								entryToAssigneeId={entry.toAssigneeId}
								entryFromValue={entry.fromValue}
								entryToValue={entry.toValue}
								authorName={authorName}
								authorAvatar={authorAvatar}
								isLastEntry={isLastEntry}
								statusLookup={statusLookup}
								memberLookup={memberLookup}
								attachments={attachments}
								showMeta={showMeta}
								isGroupContinuation={isGroupContinuation}
							/>
						);
					})}
				</div>
			))}
		</div>
	);
}

export { MatterActivityTimeline as TaskTimeline };
