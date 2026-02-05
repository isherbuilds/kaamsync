import type { QueryRowType, Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import Clock from "lucide-react/dist/esm/icons/clock";
import Send from "lucide-react/dist/esm/icons/send";
import { memo, useMemo } from "react";
import { NavLink } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { MatterListWithDetailPanel } from "~/components/matter/matter-list-layout";
import { RouteErrorBoundary } from "~/components/shared/error-boundary";
import { CustomAvatar } from "~/components/ui/avatar";
import {
	getPriorityBadgeClass,
	getPriorityDisplayLabel,
	Priority,
	sortStatusComparator,
} from "~/config/matter";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";
import { DueDateLabel, EMPTY_STATUS } from "~/lib/utils/matter";
import type { Route } from "./+types/requests";

// --------------------------------------------------------------------------
// Meta
// --------------------------------------------------------------------------

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Requests - ${params.orgSlug}` },
	{
		name: "description",
		content: "Manage and track your requests efficiently in KaamSync.",
	},
];

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

type RequestMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };
type MemberWithUser = QueryRowType<
	ReturnType<typeof queries.getOrganizationMembers>
>;

// --------------------------------------------------------------------------
// Memoized Row Component - Prevents re-render of all rows on any change
// --------------------------------------------------------------------------

interface RequestRowProps {
	matter: RequestMatter;
	assignee: MemberWithUser | undefined;
	orgSlug: string;
	isMobile: boolean;
	now: number;
}

const RequestRow = memo(function RequestRow({
	matter,
	assignee,
	orgSlug,
	isMobile,
	now,
}: RequestRowProps) {
	const priority = matter.priority ?? Priority.NONE;
	const isOverdue = matter.dueDate ? matter.dueDate < now : false;
	const matterCode = `${matter.teamCode}-${matter.shortID}`;

	const createdDate = useMemo(() => {
		if (!matter.createdAt) return null;
		return new Date(matter.createdAt).toLocaleDateString("en-IN", {
			month: "short",
			day: "numeric",
		});
	}, [matter.createdAt]);

	const linkTo = isMobile
		? `/${orgSlug}/matter/${matterCode}`
		: `/${orgSlug}/requests/matter/${matterCode}`;

	return (
		<div className="my-0.5">
			<NavLink
				prefetch={isMobile ? "none" : "intent"}
				to={linkTo}
				className={({ isActive }: { isActive: boolean }) =>
					cn(
						"group block rounded-lg border p-4 transition-colors duration-200",
						isActive
							? "border-brand-requests/40 bg-brand-requests/5"
							: "border-border bg-background/30 hover:border-brand-requests/20 hover:bg-brand-requests/5",
					)
				}
			>
				{/* Header Row: ID, Status, Priority */}
				<div className="mb-3 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span className="font-mono text-muted-foreground text-xs">
							{matterCode}
						</span>
						{priority !== Priority.NONE && (
							<span
								className={cn(
									"inline-flex items-center rounded px-2 py-0.5 font-semibold text-xs uppercase tracking-wider",
									getPriorityBadgeClass(priority),
								)}
							>
								{getPriorityDisplayLabel(priority)}
							</span>
						)}
					</div>
					{matter.status && (
						<span
							className={cn(
								"inline-flex items-center rounded border px-2 py-0.5 font-medium text-xs uppercase tracking-wider",
								matter.status.type === "pending_approval" &&
									"border-status-pending/30 bg-status-pending/10 text-status-pending",
								matter.status.type === "rejected" &&
									"border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
							)}
						>
							{matter.status.name.split(" ")[0]}
						</span>
					)}
				</div>

				{/* Title */}
				<h3 className="mb-3 line-clamp-2 font-medium text-sm leading-relaxed">
					{matter.title}
				</h3>

				{/* Footer Row */}
				<div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
					{assignee?.usersTable && (
						<div className="flex items-center gap-1.5">
							<CustomAvatar
								name={assignee.usersTable.name}
								className="size-6"
							/>
							<span className="max-w-24 truncate">
								{assignee.usersTable.name}
							</span>
						</div>
					)}
					<div className="flex gap-2">
						{matter.dueDate && (
							<DueDateLabel date={matter.dueDate} isOverdue={isOverdue} />
						)}
						{createdDate && (
							<div className="flex items-center gap-1">
								<Clock className="size-3.5" />
								<span>{createdDate}</span>
							</div>
						)}
					</div>
				</div>
			</NavLink>
		</div>
	);
});

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

export default function OrganizationRequestsPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const isMobile = useIsMobile();

	// Parallel data fetching with independent caching
	const [authoredRequests] = useQuery(
		queries.getUserAuthoredMatters(),
		CACHE_LONG,
	);
	const [requestsToApprove] = useQuery(
		queries.getRequestsToApprove(),
		CACHE_LONG,
	);
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);

	// O(1) member lookups
	const membersByUserId = useMemo(() => {
		const map = new Map<string, MemberWithUser>();
		if (!members) return map;
		for (const m of members) map.set(m.userId, m as MemberWithUser);
		return map;
	}, [members]);

	// Stable timestamp for the render cycle - prevents row re-renders
	const now = useMemo(() => Date.now(), []);

	// Single combined sort - avoids creating intermediate arrays
	const sortedRequests = useMemo(() => {
		const all: RequestMatter[] = [];
		if (requestsToApprove) all.push(...requestsToApprove);
		if (authoredRequests) all.push(...authoredRequests);
		if (all.length === 0) return all;
		return all.sort((a, b) =>
			sortStatusComparator(a.status ?? EMPTY_STATUS, b.status ?? EMPTY_STATUS),
		);
	}, [authoredRequests, requestsToApprove]);

	// Stable render function - uses memoized row component
	const renderItem = useMemo(
		() => (matter: RequestMatter) => (
			<RequestRow
				key={matter.id}
				matter={matter}
				assignee={
					matter.assigneeId ? membersByUserId.get(matter.assigneeId) : undefined
				}
				orgSlug={orgSlug}
				isMobile={isMobile}
				now={now}
			/>
		),
		[membersByUserId, orgSlug, isMobile, now],
	);

	const isLoading = !authoredRequests || !requestsToApprove;

	return (
		<MatterListWithDetailPanel
			title="Requests"
			icon={Send}
			accentColor="amber"
			items={sortedRequests}
			isLoading={isLoading}
			emptyState={{
				title: "No requests yet",
				description: "Create a request or wait for approvals to appear here.",
			}}
			estimateSize={140}
			renderItem={renderItem}
		/>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary
			title="Requests Error"
			description="Failed to load requests"
		/>
	);
}
