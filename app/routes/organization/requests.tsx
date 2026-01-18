import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { CalendarIcon, Clock, Send, UserIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NavLink } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { MatterListLayout } from "~/components/matter/matter-list-layout";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "~/components/ui/item";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import {
	compareStatuses,
	getPriorityBadge,
	getPriorityLabel,
	Priority,
} from "~/lib/constants/matter";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/requests";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Requests - ${params.orgSlug}`,
	},
	{
		name: "description",
		content: "Manage and track your requests efficiently in KaamSync.",
	},
];

type RequestMatter = Row["mattersTable"] & { status?: Row["statusesTable"] };

export default function RequestsPage() {
	const { orgSlug } = useOrgLoaderData();
	const isMobile = useIsMobile();

	const [requests = []] = useQuery(queries.getUserAuthoredMatters(), {
		...CACHE_LONG,
	});

	const [members = []] = useQuery(queries.getOrganizationMembers(), {
		...CACHE_LONG,
	});

	const sortedRequests = useMemo(() => {
		if (!requests) return [];
		return [...requests].sort((a, b) =>
			compareStatuses(a.status || {}, b.status || {}),
		);
	}, [requests]);

	const membersMap = useMemo(() => {
		const map = new Map();
		if (!members) return map;
		for (const m of members) {
			map.set(m.userId, m);
		}
		return map;
	}, [members]);

	const renderRequestItem = useCallback(
		(matter: RequestMatter) => {
			const assignee = membersMap.get(matter.assigneeId);
			const createdDate = matter.createdAt
				? new Date(matter.createdAt).toLocaleDateString("en-IN", {
						month: "short",
						day: "numeric",
					})
				: null;

			return (
				<NavLink
					className={({ isActive }: { isActive: boolean }) =>
						cn(
							"group relative block transition-all duration-200",
							isActive ? "bg-brand-requests/5" : "hover:bg-muted/50",
							"border-b p-2",
						)
					}
					key={matter.id}
					prefetch="viewport"
					to={
						isMobile
							? `/${orgSlug}/matter/${matter.teamCode}-${matter.shortID}`
							: `/${orgSlug}/requests/matter/${matter.teamCode}-${matter.shortID}`
					}
				>
					<Item className="w-full" key={matter.id}>
						<ItemContent className="flex-col gap-2">
							<div className="flex items-center gap-2">
								<span className="font-mono text-muted-foreground/70 text-xs">
									{matter.teamCode}-{matter.shortID}
								</span>
								{matter.priority != null &&
									matter.priority !== Priority.NONE && (
										<span
											className={cn(
												"inline-flex items-center rounded px-1.5 py-0.5 font-semibold text-[10px] uppercase tracking-wider transition-colors",
												getPriorityBadge(matter.priority),
											)}
										>
											{getPriorityLabel(matter.priority)}
										</span>
									)}
								{matter.status && (
									<span
										className={cn(
											"inline-flex items-center rounded border px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wider",
											matter.status.type === "pending_approval" &&
												"border-status-pending/20 bg-status-pending/10 text-status-pending",
											matter.status.type === "rejected" &&
												"border-status-rejected/20 bg-status-rejected/10 text-status-rejected",
											matter.status.type === "approved" &&
												"border-status-approved/20 bg-status-approved/10 text-status-approved",
										)}
									>
										{matter.status.name}
									</span>
								)}
							</div>
							<ItemTitle className="line-clamp-2 font-medium text-foreground/90 text-sm leading-snug transition-colors group-hover:text-foreground">
								{matter.title}
							</ItemTitle>
							<ItemDescription className="flex flex-wrap items-center gap-2 text-muted-foreground/70 text-xs">
								{assignee && (
									<span className="flex items-center gap-1.5">
										<UserIcon className="size-3 opacity-60" />
										<span className="">{assignee.usersTable?.name}</span>
									</span>
								)}
								{matter.dueDate && (
									<span className="flex items-center gap-1.5">
										<CalendarIcon className="size-3 opacity-60" />
										<span>{new Date(matter.dueDate).toLocaleDateString()}</span>
									</span>
								)}
								{createdDate && (
									<span className="flex items-center gap-1.5">
										<Clock className="size-3 opacity-60" />
										<span>{createdDate}</span>
									</span>
								)}
							</ItemDescription>
						</ItemContent>
					</Item>
				</NavLink>
			);
		},
		[orgSlug, isMobile, membersMap],
	);

	return (
		<MatterListLayout
			title="Requests"
			icon={Send}
			accentColor="amber"
			items={sortedRequests}
			isLoading={!requests}
			emptyState={{
				title: "No requests created",
				description: "Requests you create will appear here",
			}}
			estimateSize={100}
			renderItem={renderRequestItem}
		/>
	);
}
