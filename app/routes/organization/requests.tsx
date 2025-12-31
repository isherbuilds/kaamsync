import type { Row } from "@rocicorp/zero";
import { useQuery } from "@rocicorp/zero/react";
import { CalendarIcon, Clock, Send, UserIcon } from "lucide-react";
import { useMemo } from "react";
import { NavLink, Outlet } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { EmptyState } from "~/components/ui/empty-state";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "~/components/ui/item";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "~/components/ui/resizable";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { VirtualizedList } from "~/components/virtualized-list";
// import { useInfiniteMatters } from "~/hooks/use-infinite-scroll";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { useIsMobile } from "~/hooks/use-mobile";
import {
	DETAIL_PANEL_MIN_SIZE,
	getDetailPanelSize,
	getListPanelSize,
	PANEL_MAX_SIZE,
	PANEL_MIN_SIZE,
} from "~/lib/layout-constants";
import {
	compareStatuses,
	getPriorityBadge,
	getPriorityLabel,
	Priority,
} from "~/lib/matter-constants";
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

export default function RequestsPage() {
	const { orgSlug } = useOrgLoaderData();

	const isMobile = useIsMobile();
	const isTablet = useIsMobile("tablet");
	const isExtraLargeScreen = useIsMobile("extraLargeScreen");

	// Use infinite scroll for requests - loads in pages as user scrolls
	// const {
	// 	items: requests,
	// 	isLoadingMore,
	// 	hasMore,
	// 	loadedCount,
	// 	loadMore,
	// } = useInfiniteMatters({
	// 	queryType: "userAuthored",
	// 	enabled: true, // Zero handles context check
	// });

	const [requests] = useQuery(queries.getPendingRequests({}), {
		...CACHE_LONG,
	});

	// Load members once for the entire list - cached by Zero
	const [members] = useQuery(queries.getOrganizationMembers(), {
		// enabled: Boolean(queryCtx.activeOrganizationId), // Zero handles context
		...CACHE_LONG,
	});

	// Memoize sorted requests to prevent expensive re-sorting on every render
	const sortedRequests = useMemo(() => {
		if (!requests) return [];
		return [...requests].sort((a, b) =>
			compareStatuses(a.status || {}, b.status || {}),
		);
	}, [requests]);

	if (!requests) {
		return (
			<div className="flex h-[60vh] items-center justify-center">
				<div className="text-center">
					<Send className="mx-auto size-12 text-muted-foreground/50" />
					<p className="mt-2 text-muted-foreground text-sm">
						Loading requests...
					</p>
				</div>
			</div>
		);
	}

	const requestCount = sortedRequests.length;

	return (
		<ResizablePanelGroup className="h-full" orientation="horizontal">
			<ResizablePanel
				className="border-r"
				defaultSize={getListPanelSize(isTablet, isExtraLargeScreen)}
				maxSize={PANEL_MAX_SIZE}
				minSize={PANEL_MIN_SIZE}
			>
				<div className="flex h-12 items-center justify-between border-b bg-background px-4">
					<div className="flex items-center gap-2">
						<SidebarTrigger className="lg:hidden" />
						<Send className="size-4 text-amber-500" />
						<h5 className="font-semibold">Requests</h5>
					</div>
					<div className="flex items-center gap-2">
						{/* {loadedCount > 0 && ( */}
						<span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 text-xs dark:text-amber-400">
							{requestCount}
							{/* {hasMore && "+"} */}
						</span>
						{/* )} */}
						{/* {isLoadingMore && (
							<Loader2 className="size-3 animate-spin text-muted-foreground" />
						)} */}
					</div>
				</div>
				<div className="h-[calc(100%-48px)]">
					{requestCount === 0 ? (
						<EmptyState
							icon={Send}
							iconColorClass="bg-amber-500/10"
							iconFillClass="text-amber-500/50"
							title="No requests created"
							description="Requests you create will appear here"
						/>
					) : (
						<VirtualizedList
							items={sortedRequests}
							getItemKey={(item) => item.id}
							estimateSize={100}
							// onEndReached={hasMore && !isLoadingMore ? loadMore : undefined}
							renderItem={(
								matter: Row["mattersTable"] & { status?: Row["statusesTable"] },
							) => {
								const assignee = members?.find(
									(m) => m.userId === matter.assigneeId,
								);

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
												isActive
													? "bg-amber-50/50 dark:bg-amber-900/20"
													: "hover:bg-muted/50",
												"border-b p-1",
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
																	"inline-flex items-center rounded px-1.5 py-0.5 font-semibold text-[9px] uppercase tracking-wider transition-colors",
																	getPriorityBadge(matter.priority),
																)}
															>
																{getPriorityLabel(matter.priority)}
															</span>
														)}
												</div>
												<ItemTitle className="line-clamp-2 font-normal text-foreground/90 text-sm leading-snug transition-colors group-hover:text-foreground">
													{matter.title}
												</ItemTitle>
												<ItemDescription className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground/70">
													{assignee && (
														<span className="flex items-center gap-1.5">
															<UserIcon className="size-3 opacity-60" />
															<span className="">
																{assignee.usersTable?.name}
															</span>
														</span>
													)}
													{matter.dueDate && (
														<span className="flex items-center gap-1.5">
															<CalendarIcon className="size-3 opacity-60" />
															<span>
																{new Date(matter.dueDate).toLocaleDateString()}
															</span>
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
							}}
						/>
					)}
				</div>
			</ResizablePanel>

			{!isMobile && (
				<>
					<ResizableHandle />

					<ResizablePanel
						defaultSize={getDetailPanelSize(isTablet, isExtraLargeScreen)}
						minSize={DETAIL_PANEL_MIN_SIZE}
					>
						<Outlet />
					</ResizablePanel>
				</>
			)}
		</ResizablePanelGroup>
	);
}
