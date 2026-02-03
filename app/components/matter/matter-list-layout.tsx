import type { Row } from "@rocicorp/zero";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";
import { Outlet } from "react-router";
import { VirtualizedList } from "~/components/shared/virtualized-list";
import { EmptyState } from "~/components/ui/empty-state";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "~/components/ui/resizable";
import { SidebarTrigger } from "~/components/ui/sidebar";
import {
	DETAIL_PANEL_MIN_SIZE,
	getDetailPanelSize,
	getListPanelSize,
	PANEL_MAX_SIZE,
	PANEL_MIN_SIZE,
} from "~/config/layout";
import { useBreakpoints } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

type MatterWithStatus = Row["mattersTable"] & {
	status?: Row["statusesTable"];
};

interface MatterListWithDetailPanelProps<T extends MatterWithStatus> {
	/** Page title shown in header */
	title: string;
	/** Icon shown next to title */
	icon: LucideIcon;
	/** Accent color class for icon and badge (e.g., "blue", "amber") */
	accentColor: "blue" | "amber";
	/** Items to display */
	items: readonly T[];
	/** Whether data is still loading */
	isLoading: boolean;
	/** Empty state configuration */
	emptyState: {
		title: string;
		description: string;
	};
	/** Estimated row height for virtualization */
	estimateSize?: number;
	/** Render function for each item */
	renderItem: (item: T) => React.ReactNode;
	/** Optional extra content to render in header (e.g., tabs, filters) */
	headerExtra?: React.ReactNode;
}

const ACCENT_COLOR_CLASSES = {
	blue: {
		icon: "text-brand-tasks",
		badge: "bg-brand-tasks/10 text-brand-tasks",
		emptyBg: "bg-brand-tasks/10",
		emptyIcon: "text-brand-tasks/50",
	},
	amber: {
		icon: "text-brand-requests",
		badge: "bg-brand-requests/10 text-brand-requests",
		emptyBg: "bg-brand-requests/10",
		emptyIcon: "text-brand-requests/50",
	},
} as const;

const ListHeader = ({
	title,
	colors,
	itemCount,
	isLoading,
	Icon,
	headerExtra,
}: {
	title: string;
	colors: (typeof ACCENT_COLOR_CLASSES)["blue" | "amber"];
	itemCount: number;
	isLoading: boolean;
	Icon: LucideIcon;
	headerExtra?: React.ReactNode;
}) => (
	<div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
		<div className="flex items-center gap-2">
			<SidebarTrigger className="lg:hidden" />
			<Icon className={`size-4 ${colors.icon}`} />
			<h5 className="font-semibold">{title}</h5>
		</div>
		{headerExtra}
		<div className="flex items-center gap-2">
			{isLoading ? (
				<div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
			) : (
				<span
					className={cn(
						"rounded-full px-2 py-0.5 font-medium text-xs",
						colors.badge,
					)}
				>
					{itemCount}
				</span>
			)}
		</div>
	</div>
);

const ListLoadingSkeleton = () => (
	<div className="space-y-1 p-1">
		{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
			<div
				key={`skeleton-${i}`}
				className="flex items-start gap-3 rounded-md border border-transparent p-3"
			>
				<div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
				<div className="flex-1 space-y-2">
					<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
					<div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
				</div>
				<div className="v-stack items-end gap-1">
					<div className="size-4 animate-pulse rounded bg-muted" />
					<div className="h-3 w-8 animate-pulse rounded bg-muted" />
				</div>
			</div>
		))}
	</div>
);

const DetailPanelPlaceholder = ({ Icon }: { Icon: LucideIcon }) => (
	<div className="center flex h-full">
		<div className="text-center">
			<Icon className="mx-auto size-12 text-muted-foreground/30" />
			<p className="mt-2 text-muted-foreground text-sm">
				Select an item to view details
			</p>
		</div>
	</div>
);

/**
 * Shared layout component for matter list pages (Tasks, Requests).
 * Provides resizable panel structure with header, empty state, and virtualized list.
 */
function MatterListWithDetailPanelInner<T extends MatterWithStatus>({
	title,
	icon: Icon,
	accentColor,
	items,
	isLoading,
	emptyState,
	estimateSize = 60,
	renderItem,
	headerExtra,
}: MatterListWithDetailPanelProps<T>) {
	const { isMobile, isTablet, isExtraLargeScreen } = useBreakpoints();

	const colors = ACCENT_COLOR_CLASSES[accentColor];
	const itemCount = items.length;

	return (
		<ResizablePanelGroup className="h-full" orientation="horizontal">
			<ResizablePanel
				defaultSize={getListPanelSize(isTablet, isExtraLargeScreen)}
				maxSize={PANEL_MAX_SIZE}
				minSize={PANEL_MIN_SIZE}
			>
				<ListHeader
					title={title}
					colors={colors}
					itemCount={itemCount}
					isLoading={isLoading}
					Icon={Icon}
					headerExtra={headerExtra}
				/>
				<div className="h-[calc(100%-56px)]">
					{isLoading ? (
						<ListLoadingSkeleton />
					) : itemCount === 0 ? (
						<EmptyState
							icon={Icon}
							iconColorClass={colors.emptyBg}
							iconFillClass={colors.emptyIcon}
							title={emptyState.title}
							description={emptyState.description}
						/>
					) : (
						<VirtualizedList
							items={items}
							getItemKey={(item) => item.id}
							estimateSize={estimateSize}
							className="px-1 py-0.5"
							renderItem={renderItem}
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
						{isLoading ? <DetailPanelPlaceholder Icon={Icon} /> : <Outlet />}
					</ResizablePanel>
				</>
			)}
		</ResizablePanelGroup>
	);
}

export const MatterListWithDetailPanel = memo(
	MatterListWithDetailPanelInner,
) as typeof MatterListWithDetailPanelInner;
