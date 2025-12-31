import { useQuery } from "@rocicorp/zero/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type MatterSortCursor, queries } from "zero/queries";
import { CACHE_NAV } from "zero/query-cache-policy";

// Page size based on zbugs patterns
const PAGE_SIZE = 50;

// Threshold for loading more (scroll position from bottom)
const LOAD_MORE_THRESHOLD = 200;

type PaginationState = {
	cursor: MatterSortCursor | null;
	direction: "forward" | "backward";
	hasMore: boolean;
	loadedCount: number;
};

type QueryType = "team" | "userAssigned" | "userAuthored";

interface UseInfiniteScrollOptions {
	/** Team ID (required for team query type) */
	teamId?: string;
	/** Query type to use */
	queryType?: QueryType;
	enabled?: boolean;
	initialPageSize?: number;
}

interface UseInfiniteScrollResult<T> {
	/** All loaded items, accumulated from all pages */
	items: T[];
	/** Whether initial load is complete */
	isLoading: boolean;
	/** Whether currently loading more items */
	isLoadingMore: boolean;
	/** Whether there are more items to load */
	hasMore: boolean;
	/** Actual count loaded */
	loadedCount: number;
	/** Call when user scrolls near the end */
	loadMore: () => void;
	/** Reset pagination state */
	reset: () => void;
	/** Ref to attach to the scroll container for auto-loading */
	scrollRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Get the appropriate paginated query based on query type
 */
function getPaginatedQuery(
	queryType: QueryType,
	teamId: string | undefined,
	pageSize: number,
	cursor: MatterSortCursor | null,
	direction: "forward" | "backward",
) {
	switch (queryType) {
		case "userAssigned":
			return queries.getUserAssignedMattersPaginated({
				limit: pageSize,
				cursor,
				direction,
			});
		case "userAuthored":
			return queries.getUserAuthoredMattersPaginated({
				limit: pageSize,
				cursor,
				direction,
			});
		case "team":
		default:
			return queries.getTeamMattersPaginated({
				teamId: teamId || "",
				limit: pageSize,
				cursor,
				direction,
			});
	}
}

/**
 * Infinite scroll hook for loading matters with keyset pagination.
 * Based on zbugs list-page.tsx patterns.
 *
 * Features:
 * - Keyset pagination for efficient database queries
 * - Accumulates items across pages
 * - Tracks total count estimate
 * - Auto-loads more when scrolling near bottom
 *
 * @example
 * ```tsx
 * const { items, hasMore, loadMore, scrollRef, loadedCount } = useInfiniteMatters({
 *   teamId: team.id,
 *   queryType: 'team',
 * });
 *
 * return (
 *   <div ref={scrollRef} className="h-full overflow-auto">
 *     <div>{loadedCount} items{hasMore && '+'}</div>
 *     {items.map(item => <ItemRow key={item.id} item={item} />)}
 *     {hasMore && <LoadingSpinner />}
 *   </div>
 * );
 * ```
 */
export function useInfiniteMatters(
	options: UseInfiniteScrollOptions,
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
): UseInfiniteScrollResult<any> {
	const {
		teamId,
		queryType = "team",
		enabled = true,
		initialPageSize = PAGE_SIZE,
	} = options;

	// Determine if query should be enabled based on query type
	const queryEnabled =
		enabled && (queryType === "team" ? Boolean(teamId) : true); // Context check handled by Zero

	// Track accumulated items across pages
	// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
	const [accumulatedItems, setAccumulatedItems] = useState<any[]>([]);

	// Pagination state
	const [pagination, setPagination] = useState<PaginationState>({
		cursor: null,
		direction: "forward",
		hasMore: true,
		loadedCount: 0,
	});

	// Track if we're loading more
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	// Scroll container ref for auto-loading
	const scrollRef = useRef<HTMLDivElement | null>(null);

	// Current page query using dynamic query selector
	// No context passed to getPaginatedQuery
	const [currentPage, queryResult] = useQuery(
		getPaginatedQuery(
			queryType,
			teamId,
			initialPageSize,
			pagination.cursor,
			pagination.direction,
		) as any,
		{ enabled: queryEnabled, ...CACHE_NAV },
	);

	// Cache key for tracking changes (team ID or query type)
	const cacheKey = queryType === "team" ? teamId : queryType;

	// Track cache key changes to reset state
	const prevCacheKeyRef = useRef(cacheKey);
	useEffect(() => {
		if (prevCacheKeyRef.current !== cacheKey) {
			prevCacheKeyRef.current = cacheKey;
			setAccumulatedItems([]);
			setPagination({
				cursor: null,
				direction: "forward",
				hasMore: true,
				loadedCount: 0,
			});
			setIsLoadingMore(false);
		}
	}, [cacheKey]);

	// Update accumulated items when new data arrives
	useEffect(() => {
		if (queryResult.type !== "complete" || !currentPage) return;

		// If no cursor, this is the first page - replace items
		if (pagination.cursor === null) {
			setAccumulatedItems(currentPage);
			setPagination((prev) => ({
				...prev,
				hasMore: currentPage.length === initialPageSize,
				loadedCount: currentPage.length,
			}));
		} else {
			// Append new items, avoiding duplicates
			setAccumulatedItems((prev) => {
				const existingIds = new Set(prev.map((item) => item.id));
				const newItems = currentPage.filter(
					(item) => item && "id" in item && !existingIds.has(item.id),
				);
				return [...prev, ...newItems];
			});
			setPagination((prev) => ({
				...prev,
				hasMore: currentPage.length === initialPageSize,
				loadedCount: prev.loadedCount + currentPage.length,
			}));
		}

		setIsLoadingMore(false);
	}, [currentPage, queryResult.type, pagination.cursor, initialPageSize]);

	// Load more function
	const loadMore = useCallback(() => {
		if (!pagination.hasMore || isLoadingMore || accumulatedItems.length === 0)
			return;

		const lastItem = accumulatedItems[accumulatedItems.length - 1];
		if (!lastItem) return;

		setIsLoadingMore(true);
		setPagination((prev) => ({
			...prev,
			cursor: {
				id: lastItem.id,
				createdAt:
					lastItem.createdAt instanceof Date
						? lastItem.createdAt.getTime()
						: lastItem.createdAt,
				priority: lastItem.priority ?? 0,
			},
		}));
	}, [pagination.hasMore, isLoadingMore, accumulatedItems]);

	// Reset function
	const reset = useCallback(() => {
		setAccumulatedItems([]);
		setPagination({
			cursor: null,
			direction: "forward",
			hasMore: true,
			loadedCount: 0,
		});
		setIsLoadingMore(false);
	}, []);

	// Auto-load more when scrolling near bottom
	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = scrollElement;
			const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

			if (
				distanceFromBottom < LOAD_MORE_THRESHOLD &&
				pagination.hasMore &&
				!isLoadingMore
			) {
				loadMore();
			}
		};

		scrollElement.addEventListener("scroll", handleScroll, { passive: true });
		return () => scrollElement.removeEventListener("scroll", handleScroll);
	}, [loadMore, pagination.hasMore, isLoadingMore]);

	return {
		items: accumulatedItems,
		isLoading: queryResult.type === "unknown" && pagination.cursor === null,
		isLoadingMore,
		hasMore: pagination.hasMore,
		loadedCount: accumulatedItems.length,
		loadMore,
		reset,
		scrollRef,
	};
}
