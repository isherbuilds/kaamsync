import {
	defaultRangeExtractor,
	type Range,
	useVirtualizer,
} from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { itemSizeCache } from "~/lib/cache/lru";

interface VirtualizedListProps<T> {
	items: readonly T[];
	renderItem: (
		item: T,
		index: number,
		isActiveSticky?: boolean,
	) => React.ReactNode;
	estimateSize?: number;
	overscan?: number;
	className?: string;
	getItemKey?: (item: T, index: number) => string;
	onEndReached?: () => void;
	onEndReachedThreshold?: number;
	stickyIndices?: number[];
}

export const VirtualizedList = memo(function VirtualizedList<T>({
	items,
	renderItem,
	estimateSize = 56,
	overscan = 5,
	className = "",
	getItemKey,
	onEndReached,
	onEndReachedThreshold = 200,
	stickyIndices = [],
}: VirtualizedListProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null);
	const activeStickyIndexRef = useRef(0);

	const stickySet = useMemo(() => new Set(stickyIndices), [stickyIndices]);
	const reversedSticky = useMemo(
		() => [...stickyIndices].reverse(),
		[stickyIndices],
	);

	const stableRef = useRef({ items, getItemKey });
	stableRef.current.items = items;
	stableRef.current.getItemKey = getItemKey;

	const getScrollElement = useCallback(() => parentRef.current, []);

	const estimateSizeFn = useCallback(
		(i: number) => {
			const { items: itms, getItemKey: gk } = stableRef.current;
			if (gk && itms[i]) {
				const cached = itemSizeCache.get(gk(itms[i], i));
				if (cached !== undefined) return cached;
			}
			return estimateSize;
		},
		[estimateSize],
	);

	const getItemKeyFn = useCallback((i: number) => {
		const { items: itms, getItemKey: gk } = stableRef.current;
		return gk && itms[i] ? gk(itms[i], i) : String(i);
	}, []);

	const rangeExtractor = useCallback(
		(range: Range) => {
			activeStickyIndexRef.current =
				reversedSticky.find((i) => range.startIndex >= i) ?? 0;
			const next = new Set([
				activeStickyIndexRef.current,
				...defaultRangeExtractor(range),
			]);
			return [...next].sort((a, b) => a - b);
		},
		[reversedSticky],
	);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement,
		estimateSize: estimateSizeFn,
		overscan,
		getItemKey: getItemKey ? getItemKeyFn : undefined,
		rangeExtractor: stickyIndices.length > 0 ? rangeExtractor : undefined,
	});

	const measureElement = useCallback(
		(el: Element | null) => {
			if (!el) return;
			virtualizer.measureElement(el);
			const idx = Number((el as HTMLElement).dataset.index);
			if (Number.isNaN(idx)) return;
			const { items: itms, getItemKey: gk = stableRef.current.getItemKey } =
				stableRef.current;
			if (gk && itms[idx]) {
				const key = gk(itms[idx], idx);
				const h = el.getBoundingClientRect().height;
				if (h > 0 && itemSizeCache.get(key) !== h) {
					itemSizeCache.set(key, h);
				}
			}
		},
		[virtualizer],
	);

	useEffect(
		function setupEndReachedScrollListener() {
			if (!onEndReached) return;
			const el = parentRef.current;
			if (!el) return;
			const onScroll = () => {
				if (
					el.scrollHeight - el.scrollTop - el.clientHeight <
					onEndReachedThreshold
				)
					onEndReached();
			};
			el.addEventListener("scroll", onScroll, { passive: true });
			return function cleanupEndReachedScrollListener() {
				el.removeEventListener("scroll", onScroll);
			};
		},
		[onEndReached, onEndReachedThreshold],
	);

	const vItems = virtualizer.getVirtualItems();

	return (
		<div
			ref={parentRef}
			className={`h-full w-full overflow-auto ${className}`}
			style={{
				contain: "strict",
				scrollbarWidth: "thin",
			}}
		>
			<div
				style={{
					height: virtualizer.getTotalSize(),
					width: "100%",
					position: "relative",
				}}
			>
				{vItems.map((v) => {
					const isSticky = stickySet.has(v.index);
					const isActiveSticky =
						isSticky && activeStickyIndexRef.current === v.index;

					return (
						<div
							key={v.key}
							data-index={v.index}
							ref={measureElement}
							style={{
								position: isActiveSticky ? "sticky" : "absolute",
								top: 0,
								left: 0,
								width: "100%",
								transform: isActiveSticky
									? undefined
									: `translateY(${v.start}px)`,
								zIndex: isSticky ? 1 : undefined,
							}}
						>
							{items[v.index] &&
								renderItem(items[v.index], v.index, isActiveSticky)}
						</div>
					);
				})}
			</div>
		</div>
	);
}) as typeof ParentVirtualizedList;

function ParentVirtualizedList<T>(_props: VirtualizedListProps<T>) {
	return null;
}
