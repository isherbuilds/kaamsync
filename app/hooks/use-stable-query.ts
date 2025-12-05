import {
	type QueryResultDetails,
	type UseQueryOptions,
	useQuery,
} from "@rocicorp/zero/react";
import { useMemo, useRef } from "react";

/**
 * Deduplicates query results across renders by comparing query hash.
 *
 * Based on zbugs patterns - prevents redundant re-queries when query
 * parameters haven't actually changed.
 */
export function useStableQuery<T>(
	// biome-ignore lint/suspicious/noExplicitAny: Query type from Zero is complex
	query: any,
	options?: UseQueryOptions,
): [T[], QueryResultDetails] {
	const [data, result] = useQuery(query, options);
	const lastDataRef = useRef<T[]>(data as T[]);
	const lastQueryHashRef = useRef<string>("");

	// Simple hash of query for comparison
	const queryHash = useMemo(() => {
		try {
			return JSON.stringify(query);
		} catch {
			return String(Date.now());
		}
	}, [query]);

	// Return cached data if query hasn't changed and we have data
	if (
		queryHash === lastQueryHashRef.current &&
		lastDataRef.current.length > 0
	) {
		return [lastDataRef.current, result];
	}

	// Update refs with new data
	lastQueryHashRef.current = queryHash;
	if (data && (data as T[]).length > 0) {
		lastDataRef.current = data as T[];
	}

	return [data as T[], result];
}

/**
 * Caches query results to prevent flash of empty content during navigation.
 *
 * When switching workspaces, this hook maintains the previous data
 * until new data is loaded, preventing UI flicker.
 *
 * @example
 * ```tsx
 * const [tasks, status] = useCachedQuery(
 *   queries.getWorkspaceMatters(ctx, workspaceId),
 *   CACHE_NAV
 * );
 * // `tasks` will show previous workspace data until new data loads
 * ```
 */
export function useCachedQuery<T>(
	// biome-ignore lint/suspicious/noExplicitAny: Query type from Zero is complex
	query: any,
	options?: UseQueryOptions,
): [T[], QueryResultDetails & { isStale: boolean }] {
	const [data, result] = useQuery(query, options);
	const cacheRef = useRef<{ data: T[]; queryKey: string }>({
		data: [],
		queryKey: "",
	});

	// Create stable query key
	const queryKey = useMemo(() => {
		try {
			return JSON.stringify(query);
		} catch {
			return "";
		}
	}, [query]);

	// If we have new data, update cache
	if (data && (data as T[]).length > 0) {
		cacheRef.current = { data: data as T[], queryKey };
	}

	// Return cached data if current query has no data yet
	const actualData =
		(data as T[]).length > 0 ? (data as T[]) : cacheRef.current.data;
	const isStale =
		cacheRef.current.queryKey !== queryKey &&
		actualData === cacheRef.current.data;

	return [actualData, { ...result, isStale }];
}

/**
 * Memoizes query options to prevent unnecessary re-renders.
 * Use when query options are created inline and causing re-queries.
 *
 * @example
 * ```tsx
 * // Without memoization - creates new options object every render
 * const [data] = useQuery(query, { enabled: isReady, ttl: '10s' });
 *
 * // With memoization - stable options reference
 * const options = useStableQueryOptions({ enabled: isReady }, [isReady]);
 * const [data] = useQuery(query, options);
 * ```
 */
export function useStableQueryOptions(
	options: UseQueryOptions,
	deps: React.DependencyList,
): UseQueryOptions {
	// biome-ignore lint/correctness/useExhaustiveDependencies: deps are explicitly provided
	return useMemo(() => options, deps);
}
