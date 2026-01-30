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
			return <p className="text-sm">{entry.content}</p>;

		case "created":
			return <p className="text-muted-foreground text-sm">created this task</p>;

		case "status_change":
			return (
				<p className="text-muted-foreground text-sm">
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
			return (
				<p className="text-muted-foreground text-sm">
					assigned this to{" "}
					<span className="font-medium text-foreground">
						{resolveMemberName(entry.toAssigneeId, memberLookup)}
					</span>
				</p>
			);

		default:
			return (
				<p className="text-muted-foreground text-sm italic">
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
		<div className="relative flex gap-3">
			{/* Vertical connector line */}
			{!isLastEntry && (
				<div className="absolute top-8 bottom-0 left-4 w-px bg-border" />
			)}

			{/* Author avatar */}
			<div className="relative z-10 flex size-8 shrink-0 center rounded-full bg-muted ring-2 ring-background">
				{authorAvatar ? (
					<img
						src={authorAvatar}
						alt={authorName}
						className="size-full rounded-full object-cover"
					/>
				) : (
					<span className="font-bold text-[10px]">
						{extractNameInitials(authorName)}
					</span>
				)}
			</div>

			{/* Entry content */}
			<div className="flex-1 pb-4">
				<div className="mb-1 flex items-center gap-2">
					<span className="font-semibold text-sm">{authorName}</span>
					<span className="text-muted-foreground text-xs">
						{formatActivityTimestamp(entry.createdAt)}
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
				{entry.type === "comment" && commentAttachments.length > 0 && (
					<AttachmentPreviewList
						compact
						className="mt-2"
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
			<p className="text-muted-foreground text-sm italic">No activity yet</p>
		);
	}

	return (
		<div className="space-y-4">
			{timelineEntries.map((entry, index) => (
				<ActivityEntryItem
					key={entry.id}
					entry={entry}
					isLastEntry={index === timelineEntries.length - 1}
					statusLookup={statusLookup}
					memberLookup={memberLookup}
				/>
			))}
		</div>
	);
}

export { MatterActivityTimeline as TaskTimeline };
