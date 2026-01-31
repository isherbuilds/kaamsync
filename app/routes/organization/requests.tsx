import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Clock from "lucide-react/dist/esm/icons/clock";
import Send from "lucide-react/dist/esm/icons/send";
import { useCallback, useMemo } from "react";
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
import { cn, formatDueDateLabel } from "~/lib/utils";

import type { Route } from "./+types/requests";

// --------------------------------------------------------------------------
// Meta
// --------------------------------------------------------------------------

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Requests - ${params.orgSlug}`,
	},
	{
		name: "description",
		content: "Manage and track your requests efficiently in KaamSync.",
	},
];

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

type RequestMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function OrganizationRequestsPage() {
	const { orgSlug } = useOrganizationLoaderData();
	const isMobile = useIsMobile();

	// --------------------------------------------------------------------------
	// Data Fetching
	// --------------------------------------------------------------------------

	const [requests] = useQuery(queries.getUserAuthoredMatters(), {
		...CACHE_LONG,
	});

	const [members] = useQuery(queries.getOrganizationMembers(), {
		...CACHE_LONG,
	});

	// --------------------------------------------------------------------------
	// Memoized Values
	// --------------------------------------------------------------------------

	const sortedRequestsByStatus = useMemo(() => {
		if (!requests) return [];
		return [...requests].sort((a, b) =>
			sortStatusComparator(a.status || {}, b.status || {}),
		);
	}, [requests]);

	const membersByUserId = useMemo(() => {
		const map = new Map();
		if (!members) return map;
		for (const m of members) {
			map.set(m.userId, m);
		}
		return map;
	}, [members]);

	// --------------------------------------------------------------------------
	// Callbacks
	// --------------------------------------------------------------------------

	const handleRenderRequestItem = useCallback(
		(matter: RequestMatter) => {
			const assignee = membersByUserId.get(matter.assigneeId);
			const now = Date.now();
			const priority = matter.priority ?? Priority.NONE;
			const createdDate = matter.createdAt
				? new Date(matter.createdAt).toLocaleDateString("en-IN", {
						month: "short",
						day: "numeric",
					})
				: null;

			return (
				<NavLink
					key={matter.id}
					prefetch="viewport"
					to={
						isMobile
							? `/${orgSlug}/matter/${matter.teamCode}-${matter.shortID}`
							: `/${orgSlug}/requests/matter/${matter.teamCode}-${matter.shortID}`
					}
					className={({ isActive }: { isActive: boolean }) =>
						cn(
							"group my-0.5 block rounded-lg border p-4 transition-all duration-200",
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
								{matter.teamCode}-{matter.shortID}
							</span>
							{matter.priority != null && matter.priority !== Priority.NONE && (
								<span
									className={cn(
										"inline-flex items-center rounded px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
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
									"inline-flex items-center rounded border px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider",
									matter.status.type === "pending_approval" &&
										"border-status-pending/30 bg-status-pending/10 text-status-pending",
									matter.status.type === "rejected" &&
										"border-status-rejected/30 bg-status-rejected/10 text-status-rejected",
								)}
							>
								{matter.status.name}
							</span>
						)}
					</div>

					{/* Title */}
					<h3 className="mb-3 line-clamp-2 font-medium text-foreground text-sm leading-relaxed">
						{matter.title}
					</h3>

					{/* Footer Row: Assignee, Due Date, Created */}
					<div className="flex items-center justify-between gap-4 text-muted-foreground text-xs">
						{assignee && (
							<div className="flex items-center gap-1.5">
								<CustomAvatar
									name={assignee.usersTable?.name}
									className="size-6"
								/>
								<span className="max-w-[100px] truncate">
									{assignee.usersTable?.name}
								</span>
							</div>
						)}

						<div className="flex gap-2">
							{matter.dueDate && (
								<div
									className={cn(
										"flex items-center gap-1",
										matter.dueDate < now && "text-priority-urgent",
									)}
								>
									<CalendarIcon className="size-3.5" />
									<span>{formatDueDateLabel(matter.dueDate)}</span>
								</div>
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
			);
		},
		[orgSlug, isMobile, membersByUserId],
	);

	// --------------------------------------------------------------------------
	// Render
	// --------------------------------------------------------------------------

	return (
		<MatterListWithDetailPanel
			title="Requests"
			icon={Send}
			accentColor="amber"
			items={sortedRequestsByStatus}
			isLoading={!requests}
			emptyState={{
				title: "No requests created",
				description: "Requests you create will appear here",
			}}
			estimateSize={140}
			renderItem={handleRenderRequestItem}
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
