import { useSyncExternalStore } from "react";

/** Breakpoint thresholds in pixels */
const BREAKPOINTS = {
	mobile: 768,
	tablet: 1024,
	largeScreen: 1280,
	extraLargeScreen: 1920,
} as const;

type BreakpointVariant = keyof typeof BREAKPOINTS;

/** Result of useBreakpoints containing all breakpoint states */
interface BreakpointState {
	isMobile: boolean;
	isTablet: boolean;
	isLargeScreen: boolean;
	isExtraLargeScreen: boolean;
}

/**
 * Hook that returns all breakpoint states for responsive layouts.
 *
 * Uses `useSyncExternalStore` for correct SSR/hydration handling.
 * All values are `false` during server-side rendering.
 *
 * @returns Object containing boolean flags for each breakpoint
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet } = useBreakpoints();
 * return isMobile ? <MobileNav /> : <DesktopNav />;
 * ```
 */
export function useBreakpoints(): BreakpointState {
	return useSyncExternalStore(
		subscribeToAllBreakpoints,
		getSnapshot,
		getServerSnapshot,
	);
}

/**
 * Hook to check if the viewport matches a specific breakpoint.
 *
 * Optimized to only subscribe to the specific media query needed.
 * Returns `false` during server-side rendering.
 *
 * @param variant - The breakpoint to check against (defaults to "mobile")
 * @returns `true` if viewport is at or below the breakpoint (or above for extraLargeScreen)
 *
 * @example
 * ```tsx
 * const isMobile = useIsMobile();
 * const isTabletOrSmaller = useIsMobile("tablet");
 * ```
 */
export function useIsMobile(variant: BreakpointVariant = "mobile"): boolean {
	const mediaQuery =
		variant === "extraLargeScreen"
			? `(min-width: ${BREAKPOINTS[variant]}px)`
			: `(max-width: ${BREAKPOINTS[variant] - 1}px)`;

	return useSyncExternalStore(
		(onStoreChange) => {
			const mediaQueryList = window.matchMedia(mediaQuery);
			mediaQueryList.addEventListener("change", onStoreChange);
			return () => mediaQueryList.removeEventListener("change", onStoreChange);
		},
		() => window.matchMedia(mediaQuery).matches,
		() => false,
	);
}

const MEDIA_QUERIES = {
	isMobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
	isTablet: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
	isLargeScreen: `(max-width: ${BREAKPOINTS.largeScreen - 1}px)`,
	isExtraLargeScreen: `(min-width: ${BREAKPOINTS.extraLargeScreen}px)`,
} as const;

let cachedSnapshot: BreakpointState | null = null;

function getSnapshot(): BreakpointState {
	const currentState: BreakpointState = {
		isMobile: window.matchMedia(MEDIA_QUERIES.isMobile).matches,
		isTablet: window.matchMedia(MEDIA_QUERIES.isTablet).matches,
		isLargeScreen: window.matchMedia(MEDIA_QUERIES.isLargeScreen).matches,
		isExtraLargeScreen: window.matchMedia(MEDIA_QUERIES.isExtraLargeScreen)
			.matches,
	};

	const hasChanged =
		!cachedSnapshot ||
		cachedSnapshot.isMobile !== currentState.isMobile ||
		cachedSnapshot.isTablet !== currentState.isTablet ||
		cachedSnapshot.isLargeScreen !== currentState.isLargeScreen ||
		cachedSnapshot.isExtraLargeScreen !== currentState.isExtraLargeScreen;

	if (hasChanged) {
		cachedSnapshot = currentState;
	}

	return cachedSnapshot as BreakpointState;
}

const SERVER_SNAPSHOT: BreakpointState = {
	isMobile: false,
	isTablet: false,
	isLargeScreen: false,
	isExtraLargeScreen: false,
};

function getServerSnapshot(): BreakpointState {
	return SERVER_SNAPSHOT;
}

function subscribeToAllBreakpoints(onStoreChange: () => void): () => void {
	const mediaQueryLists = Object.values(MEDIA_QUERIES).map((query) =>
		window.matchMedia(query),
	);

	for (const mql of mediaQueryLists) {
		mql.addEventListener("change", onStoreChange);
	}

	return () => {
		for (const mql of mediaQueryLists) {
			mql.removeEventListener("change", onStoreChange);
		}
	};
}
