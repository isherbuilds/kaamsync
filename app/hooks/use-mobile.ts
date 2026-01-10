import { useSyncExternalStore } from "react";

const BREAKPOINTS = {
	mobile: 768,
	tablet: 1024,
	largeScreen: 1280,
	extraLargeScreen: 1920,
};

type BreakpointVariant = keyof typeof BREAKPOINTS;

/**
 * Hook that returns an object containing all breakpoint states.
 * Uses useSyncExternalStore for correct SSR/hydration and avoided effects.
 */
export function useBreakpoints(): {
	isMobile: boolean;
	isTablet: boolean;
	isLargeScreen: boolean;
	isExtraLargeScreen: boolean;
} {
	return useSyncExternalStore(
		subscribeToAllBreakpoints,
		getSnapshot,
		getServerSnapshot,
	);
}

/**
 * Hook to determine if the window width matches a specific breakpoint variant.
 * Optimized to only listen to the specific query requested.
 */
export function useIsMobile(variant: BreakpointVariant = "mobile"): boolean {
	const query =
		variant === "extraLargeScreen"
			? `(min-width: ${BREAKPOINTS[variant]}px)`
			: `(max-width: ${BREAKPOINTS[variant] - 1}px)`;

	return useSyncExternalStore(
		(callback) => {
			const mql = window.matchMedia(query);
			mql.addEventListener("change", callback);
			return () => mql.removeEventListener("change", callback);
		},
		() => window.matchMedia(query).matches,
		() => false,
	);
}

// Helpers for useBreakpoints
const queries = {
	isMobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
	isTablet: `(max-width: ${BREAKPOINTS.tablet - 1}px)`,
	isLargeScreen: `(max-width: ${BREAKPOINTS.largeScreen - 1}px)`,
	isExtraLargeScreen: `(min-width: ${BREAKPOINTS.extraLargeScreen}px)`,
};

// Mutable cache for reference stability
let cachedSnapshot: {
	isMobile: boolean;
	isTablet: boolean;
	isLargeScreen: boolean;
	isExtraLargeScreen: boolean;
} | null = null;

function getSnapshot() {
	const newSnapshot = {
		isMobile: window.matchMedia(queries.isMobile).matches,
		isTablet: window.matchMedia(queries.isTablet).matches,
		isLargeScreen: window.matchMedia(queries.isLargeScreen).matches,
		isExtraLargeScreen: window.matchMedia(queries.isExtraLargeScreen).matches,
	};

	if (
		cachedSnapshot &&
		cachedSnapshot.isMobile === newSnapshot.isMobile &&
		cachedSnapshot.isTablet === newSnapshot.isTablet &&
		cachedSnapshot.isLargeScreen === newSnapshot.isLargeScreen &&
		cachedSnapshot.isExtraLargeScreen === newSnapshot.isExtraLargeScreen
	) {
		return cachedSnapshot;
	}

	cachedSnapshot = newSnapshot;
	return cachedSnapshot;
}

const SERVER_SNAPSHOT = {
	isMobile: false,
	isTablet: false,
	isLargeScreen: false,
	isExtraLargeScreen: false,
} as const;

function getServerSnapshot() {
	return SERVER_SNAPSHOT;
}

function subscribeToAllBreakpoints(callback: () => void) {
	const mqls = Object.values(queries).map((q) => window.matchMedia(q));
	for (const mql of mqls) {
		mql.addEventListener("change", callback);
	}
	return () => {
		for (const mql of mqls) {
			mql.removeEventListener("change", callback);
		}
	};
}
