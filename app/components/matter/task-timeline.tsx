import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { memo, useMemo } from "react";
import { queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";
import { cn, formatTimelineDate, getInitials } from "~/lib/utils";
import type { MemberSelectorItem } from "./matter-field-selectors";

// Timeline entry shape from Zero query - type is string at runtime
type TimelineEntryType = Row["timelinesTable"] & {
	user?: {
		name: string;
		image?: string | null;
	};
};

interface TaskTimelineProps {
	matterId: string;
	members: readonly MemberSelectorItem[];
	statuses: readonly Row["statusesTable"][];
}

export function TaskTimeline({
	matterId,
	members,
	statuses,
}: TaskTimelineProps) {
	const [timeline = []] = useQuery(
		matterId && queries.getMatterTimelines({ matterId }),
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
	entry: TimelineEntryType;
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
	else
		content = (
			<p className="text-muted-foreground text-sm italic">
				Unknown activity type
			</p>
		);

	return (
		<div className="relative flex gap-3">
			{!isLast && (
				<div className="absolute top-8 bottom-0 left-4 w-px bg-border" />
			)}
			<div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-background">
				{userImage ? (
					<img
						src={userImage}
						alt={userName}
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
