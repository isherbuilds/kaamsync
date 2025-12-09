import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { itemSizeCache } from "~/lib/lru-cache";

interface VirtualizedListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	estimateSize?: number;
	overscan?: number;
	className?: string;
	getItemKey?: (item: T, index: number) => string;
	onEndReached?: () => void;
	onEndReachedThreshold?: number;
}

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
	const refs = useRef({ items, getItemKey, samples: [] as number[], sum: 0 });
	refs.current.items = items;
	refs.current.getItemKey = getItemKey;

	const getScrollElement = useCallback(() => parentRef.current, []);

	const estimateSizeFn = useCallback(
		(i: number) => {
			const { items: itms, getItemKey: gk, samples, sum } = refs.current;
			if (gk && itms[i]) {
				const cached = itemSizeCache.get(gk(itms[i], i));
				if (cached !== undefined) return cached;
			}
			return samples.length ? sum / samples.length : estimateSize;
		},
		[estimateSize],
	);

	const measureElementFn = useCallback((el: Element | null) => {
		if (!el) return 0;
		const h = el.getBoundingClientRect().height;
		const attr = (el as HTMLElement).dataset.index;
		if (!attr) return h;
		const idx = +attr;
		if (h > 0 && !Number.isNaN(idx)) {
			const { items: itms, getItemKey: gk, samples } = refs.current;
			if (idx >= itms.length) return h;
			if (gk && itms[idx]) itemSizeCache.set(gk(itms[idx], idx), h);
			if (samples.length >= 30) refs.current.sum -= samples.shift() ?? 0;
			samples.push(h);
			refs.current.sum += h;
		}
		return h;
	}, []);

	const getItemKeyFn = useCallback((i: number) => {
		const { items: itms, getItemKey: gk } = refs.current;
		return gk && itms[i] ? gk(itms[i], i) : String(i);
	}, []);

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement,
		estimateSize: estimateSizeFn,
		overscan,
		measureElement: measureElementFn,
		getItemKey: getItemKey ? getItemKeyFn : undefined,
	});

	useEffect(() => {
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
		return () => el.removeEventListener("scroll", onScroll);
	}, [onEndReached, onEndReachedThreshold]);

	const vItems = virtualizer.getVirtualItems();
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
				{vItems.map((v) => (
					<div
						key={v.key}
						data-index={v.index}
						ref={virtualizer.measureElement}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${v.start}px)`,
						}}
					>
						{renderItem(items[v.index], v.index)}
					</div>
				))}
			</div>
		</div>
	);
}
