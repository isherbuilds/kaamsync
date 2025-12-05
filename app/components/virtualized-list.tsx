import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { average, itemSizeCache, sample } from "~/lib/lru-cache";

interface VirtualizedListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	estimateSize?: number;
	overscan?: number;
	className?: string;
	/** Unique key extractor for LRU cache. If provided, enables size caching. */
	getItemKey?: (item: T, index: number) => string;
	/** Callback when scrolled to bottom */
	onEndReached?: () => void;
	/** Threshold in pixels to trigger onEndReached */
	onEndReachedThreshold?: number;
}

// Sample storage for dynamic size estimation
const measurements: number[] = [];
const MAX_SAMPLES = 30;

/**
 * Virtualized list component for efficient rendering of large lists.
 * Only renders visible items in the viewport, improving performance.
 *
 * Based on patterns from zbugs app (apps/zbugs/src/pages/list/list-page.tsx):
 * - LRU cache for measured item sizes
 * - Running average for size estimation
 * - Dynamic measurement with proper caching
 * - Infinite scroll support
 *
 * @example
 * ```tsx
 * <VirtualizedList
 *   items={tasks}
 *   getItemKey={(task) => task.id}
 *   renderItem={(task) => <TaskCard task={task} />}
 *   estimateSize={56}
 *   onEndReached={loadMore}
 * />
 * ```
 */
export function VirtualizedList<T>({
	items,
	renderItem,
	estimateSize = 56,
	overscan = 5,
	className = "",
	getItemKey,
	onEndReached,
	onEndReachedThreshold = 200,
}: VirtualizedListProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: (index) => {
			// Try to get cached size first
			if (getItemKey) {
				const key = getItemKey(items[index], index);
				const cached = itemSizeCache.get(key);
				if (cached !== undefined) {
					return cached;
				}
			}
			// Fall back to running average or default estimate
			return measurements.length > 0 ? average(measurements) : estimateSize;
		},
		overscan,
		// Enable dynamic measurement
		measureElement: (el) => {
			const height = el.getBoundingClientRect().height;
			const indexStr = el.dataset.index;

			if (indexStr && height > 0) {
				const index = Number.parseInt(indexStr, 10);

				// Cache the measured size if we have a key extractor
				if (getItemKey && items[index]) {
					const key = getItemKey(items[index], index);
					itemSizeCache.set(key, height);
				}

				// Update running average
				sample(measurements, height, MAX_SAMPLES);
			}

			return height;
		},
		getItemKey: getItemKey
			? (index) => getItemKey(items[index], index)
			: undefined,
	});

	const virtualItems = virtualizer.getVirtualItems();

	// Handle infinite scroll
	useEffect(() => {
		if (!onEndReached) return;

		const element = parentRef.current;
		if (!element) return;

		const onScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = element;
			if (scrollHeight - scrollTop - clientHeight < onEndReachedThreshold) {
				onEndReached();
			}
		};

		element.addEventListener("scroll", onScroll);
		return () => element.removeEventListener("scroll", onScroll);
	}, [onEndReached, onEndReachedThreshold]);

	return (
		<div
			ref={parentRef}
			className={`h-full w-full overflow-auto ${className}`}
			style={{ contain: "strict" }}
		>
			<div
				style={{
					height: `${virtualizer.getTotalSize()}px`,
					width: "100%",
					position: "relative",
				}}
			>
				{virtualItems.map((virtualItem) => (
					<div
						key={virtualItem.key}
						data-index={virtualItem.index}
						ref={virtualizer.measureElement}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualItem.start}px)`,
						}}
					>
						{renderItem(items[virtualItem.index], virtualItem.index)}
					</div>
				))}
			</div>
		</div>
	);
}
