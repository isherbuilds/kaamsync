import { useQuery } from "@rocicorp/zero/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { renderPriorityIcon } from "~/components/icons";
import { CustomAvatar } from "~/components/ui/avatar";
import { EmptyState } from "~/components/ui/empty-state";
import { Item, ItemContent, ItemTitle } from "~/components/ui/item";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "~/components/ui/resizable";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { VirtualizedList } from "~/components/virtualized-list";
import { useInfiniteMatters } from "~/hooks/use-infinite-scroll";
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
	getPriorityColor,
	Priority,
	type PriorityValue,
	STATUS_TYPE_COLORS,
	STATUS_TYPE_ICONS,
	type StatusType,
} from "~/lib/matter-constants";
import { cn, formatCompactRelativeDate } from "~/lib/utils";

import type { Route } from "./+types/tasks";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Tasks - ${params.orgSlug}`,
		description: "Manage your tasks and assignments within the organization.",
	},
];

export default function TasksPage() {
	const { orgSlug } = useOrgLoaderData();

	const isMobile = useIsMobile();
	const isTablet = useIsMobile("tablet");
	const isExtraLargeScreen = useIsMobile("extraLargeScreen");

	// Use infinite scroll for tasks - loads in pages as user scrolls
	const {
		items: tasks,
		isLoadingMore,
		hasMore,
		loadedCount,
		loadMore,
	} = useInfiniteMatters({
		queryType: "userAssigned",
		// enabled: true, // Auto-enabled when logged in, handled by Zero
	});

	// Load members once for the entire list - cached by Zero
	const [members] = useQuery(queries.getOrganizationMembers(), {
		// enabled: Boolean(queryCtx.activeOrganizationId), // Zero handles this via implicit context
		...CACHE_LONG,
	});

	if (!tasks) {
		return (
			<div className="flex h-[60vh] items-center justify-center">
				<div className="text-center">
					<CheckCircle2 className="mx-auto size-12 text-muted-foreground/50" />
					<p className="mt-2 text-muted-foreground text-sm">Loading tasks...</p>
				</div>
			</div>
		);
	}

	// Direct sort - tasks is already an array from useInfiniteMatters
	const sortedTasks = [...tasks].sort((a, b) =>
		compareStatuses(a.status || {}, b.status || {}),
	);
	const taskCount = sortedTasks.length;

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
						<CheckCircle2 className="size-4 text-blue-500" />
						<h5 className="font-semibold">Tasks</h5>
					</div>
					<div className="flex items-center gap-2">
						{loadedCount > 0 && (
							<span className="rounded-full bg-blue-500/10 px-2 py-0.5 font-medium text-blue-600 text-xs dark:text-blue-400">
								{loadedCount}
								{hasMore && "+"}
							</span>
						)}
						{isLoadingMore && (
							<Loader2 className="size-3 animate-spin text-muted-foreground" />
						)}
					</div>
				</div>
				<div className="h-[calc(100%-48px)]">
					{taskCount === 0 ? (
						<EmptyState
							icon={CheckCircle2}
							iconColorClass="bg-blue-500/10"
							iconFillClass="text-blue-500/50"
							title="No tasks assigned"
							description="You're all caught up"
						/>
					) : (
						<VirtualizedList
							items={sortedTasks}
							getItemKey={(item) => item.id}
							estimateSize={60}
							className="p-1"
							onEndReached={hasMore && !isLoadingMore ? loadMore : undefined}
							renderItem={(matter) => {
								const priority = (matter.priority ??
									Priority.NONE) as PriorityValue;
								const statusType =
									(matter.status?.type as StatusType) ?? "not_started";
								const StatusIcon = STATUS_TYPE_ICONS[statusType];
								const author = members?.find(
									(m) => m.userId === matter.authorId,
								);

								return (
									<NavLink
										key={matter.id}
										prefetch="intent"
										to={`/${orgSlug}/${isMobile ? "" : "tasks/"}matter/${matter.workspaceCode}-${matter.shortID}`}
										className={({ isActive }) =>
											cn(
												"group relative block rounded transition-all duration-200",
												isActive
													? "bg-blue-50/60 dark:bg-blue-900/30"
													: "hover:bg-muted/50",
											)
										}
									>
										<Item className="p-3">
											<ItemContent className="flex-row items-start gap-3">
												{/* COL 1: Avatar */}
												<CustomAvatar name={author?.usersTable?.name} />

												{/* COL 2: ID + Title */}
												<ItemTitle className="line-clamp-2 min-w-0 flex-1 font-light text-foreground text-sm">
													{matter.workspaceCode}-{matter.shortID} {matter.title}
												</ItemTitle>

												{/* COL 3: Stats (Status, Priority, Time) */}
												<div className="flex shrink-0 flex-col items-end gap-1">
													{/* Top: Status */}
													{matter.status && (
														<StatusIcon
															className={STATUS_TYPE_COLORS[statusType]}
														/>
													)}

													{/* Bottom: Priority + Time */}
													<div className="flex items-center gap-1">
														{/* Priority */}
														<div className={getPriorityColor(priority)}>
															{renderPriorityIcon(priority)}
														</div>

														{/* Time */}
														{matter.dueDate && (
															<span
																className={cn(
																	"text-muted-foreground text-xs",
																	(matter.dueDate < Date.now() ||
																		priority === Priority.URGENT) &&
																		"font-medium text-red-600",
																)}
															>
																{formatCompactRelativeDate(matter.dueDate)}
															</span>
														)}
													</div>
												</div>
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
