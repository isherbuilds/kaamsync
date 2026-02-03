import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { memo, useMemo } from "react";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import { AttachmentPreviewList } from "~/components/attachments/attachment-preview-list";
import { cn, extractNameInitials, formatActivityTimestamp } from "~/lib/utils";
import type { MemberSelectorItem } from "./matter-field-selectors";

// ============================================================================
// Types
// ============================================================================

type TimelineEntry = Row["timelinesTable"] & {
	user?: {
		name: string;
		image?: string | null;
	};
};

type StatusLookup = Map<string, string>;
type MemberLookup = Map<string, string>;

interface MatterActivityTimelineProps {
	matterId: string;
	members: readonly MemberSelectorItem[];
	statuses: readonly Row["statusesTable"][];
}

interface ActivityEntryItemProps {
	entry: TimelineEntry;
	isLastEntry: boolean;
	statusLookup: StatusLookup;
	memberLookup: MemberLookup;
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
// Activity Content Renderers
// ============================================================================

function renderActivityContent(
	entry: TimelineEntry,
	statusLookup: StatusLookup,
	memberLookup: MemberLookup,
): React.ReactNode {
	switch (entry.type) {
		case "comment":
			return (
				<p className="text-sm leading-relaxed sm:text-base">{entry.content}</p>
			);

		case "created":
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					Matter created
				</p>
			);

		case "status_change":
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					changed status from{" "}
					<span className="font-medium text-foreground">
						{resolveStatusName(entry.fromStatusId, statusLookup)}
					</span>{" "}
					to{" "}
					<span className="font-medium text-primary">
						{resolveStatusName(entry.toStatusId, statusLookup)}
					</span>
				</p>
			);

		case "assigned":
		case "assignment": {
			const toName = resolveMemberName(entry.toAssigneeId, memberLookup);
			const fromName = resolveMemberName(entry.fromAssigneeId, memberLookup);
			if (!entry.toAssigneeId) {
				return (
					<p className="text-muted-foreground text-sm sm:text-base">
						Unassigned{" "}
						<span className="font-medium text-foreground">{fromName}</span>
					</p>
				);
			}
			if (!entry.fromAssigneeId) {
				return (
					<p className="text-muted-foreground text-sm sm:text-base">
						Assigned this to{" "}
						<span className="font-medium text-foreground">{toName}</span>
					</p>
				);
			}
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					Reassigned this from{" "}
					<span className="font-medium text-foreground">{fromName}</span> to{" "}
					<span className="font-medium text-foreground">{toName}</span>
				</p>
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
			const fromPriority = priorityLabels[entry.fromValue ?? "4"] ?? "None";
			const toPriority = priorityLabels[entry.toValue ?? "4"] ?? "None";
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					Changed priority from{" "}
					<span className="font-medium text-foreground">{fromPriority}</span> to{" "}
					<span className="font-medium text-primary">{toPriority}</span>
				</p>
			);
		}

		case "approval":
			return (
				<div className="space-y-1">
					<p className="text-muted-foreground text-sm sm:text-base">
						<span className="font-medium text-emerald-600">APPROVED</span> this
						Request
					</p>
					{entry.content && (
						<p className="text-muted-foreground text-sm italic">
							&ldquo;{entry.content}&rdquo;
						</p>
					)}
				</div>
			);

		case "rejection":
			return (
				<div className="space-y-1">
					<p className="text-muted-foreground text-sm sm:text-base">
						<span className="font-medium text-destructive">Rejected</span> this
						request
					</p>
					{entry.content && (
						<p className="text-muted-foreground text-sm italic">
							&ldquo;{entry.content}&rdquo;
						</p>
					)}
				</div>
			);

		case "archive":
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					<span className="font-medium text-foreground">archived</span> this
					item
				</p>
			);

		case "restore":
			return (
				<p className="text-muted-foreground text-sm sm:text-base">
					<span className="font-medium text-foreground">restored</span> this
					item
				</p>
			);

		default:
			return (
				<p className="text-muted-foreground text-sm italic sm:text-base">
					Unknown activity type
				</p>
			);
	}
}

// ============================================================================
// Activity Entry Item Component
// ============================================================================

const ActivityEntryItem = memo(function ActivityEntryItem({
	entry,
	isLastEntry,
	statusLookup,
	memberLookup,
}: ActivityEntryItemProps) {
	const authorName = entry.user?.name || "User";
	const authorAvatar = entry.user?.image;
	const [commentAttachments] = useQuery(
		queries.getCommentAttachments({ commentId: entry.id }),
		{ enabled: entry.type === "comment", ...CACHE_NAV },
	);

	const content = renderActivityContent(entry, statusLookup, memberLookup);

	return (
		<div className="relative flex gap-3 sm:gap-4">
			{/* Vertical connector line */}
			{!isLastEntry && (
				<div className="absolute top-9 bottom-0 left-4 w-px bg-border sm:top-10 sm:left-5" />
			)}

			{/* Author avatar */}
			<div className="center relative z-10 flex size-8 shrink-0 rounded-full bg-muted ring-2 ring-background sm:size-10">
				{authorAvatar ? (
					<img
						src={authorAvatar}
						alt={authorName}
						className="size-full rounded-full object-cover"
					/>
				) : (
					<span className="font-bold text-xs">
						{extractNameInitials(authorName)}
					</span>
				)}
			</div>

			{/* Entry content */}
			<div className="flex-1 pb-5 sm:pb-6">
				<div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
					<span className="font-semibold text-sm sm:text-base">
						{authorName}
					</span>
					<span className="text-muted-foreground text-xs sm:text-sm">
						{formatActivityTimestamp(entry.createdAt)}
					</span>
				</div>
				<div
					className={cn(
						"rounded-lg border bg-muted/20 px-3 py-2.5 sm:px-4 sm:py-3",
						entry.type === "comment" && "bg-background shadow-sm",
					)}
				>
					{content}
				</div>
				{entry.type === "comment" && commentAttachments.length > 0 && (
					<AttachmentPreviewList
						compact
						className="mt-2 sm:mt-3"
						attachments={commentAttachments.map((attachment) => ({
							id: attachment.id,
							fileName: attachment.fileName,
							fileType: attachment.fileType,
							fileSize: attachment.fileSize,
							storageKey: attachment.storageKey,
							publicUrl: attachment.publicUrl,
						}))}
					/>
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

	if (timelineEntries.length === 0) {
		return (
			<div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center sm:py-10">
				<p className="text-muted-foreground text-sm italic sm:text-base">
					No activity yet
				</p>
				<p className="mt-1 text-muted-foreground/70 text-xs sm:text-sm">
					Be the first to add a comment
				</p>
			</div>
		);
	}

	return (
		<>
			{timelineEntries.map((entry, index) => (
				<ActivityEntryItem
					key={entry.id}
					entry={entry}
					isLastEntry={index === timelineEntries.length - 1}
					statusLookup={statusLookup}
					memberLookup={memberLookup}
				/>
			))}
		</>
	);
}

export { MatterActivityTimeline as TaskTimeline };
