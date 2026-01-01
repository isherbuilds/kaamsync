import { useEffect, useState } from "react";

const BREAKPOINTS = {
	mobile: 768,
	tablet: 1024,
	largeScreen: 1280,
	extraLargeScreen: 1920,
};

type BreakpointVariant = keyof typeof BREAKPOINTS;

/**
 * Hook that returns an object containing all breakpoint states.
 * Uses shallow comparison to prevent unnecessary re-renders.
 */
export function useBreakpoints() {
	const [breakpoints, setBreakpoints] = useState({
		isMobile: false,
		isTablet: false,
		isLargeScreen: false,
		isExtraLargeScreen: false,
	});

	useEffect(() => {
		const queries = {
			isMobile: window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`),
			isTablet: window.matchMedia(`(max-width: ${BREAKPOINTS.tablet - 1}px)`),
			isLargeScreen: window.matchMedia(
				`(max-width: ${BREAKPOINTS.largeScreen - 1}px)`,
			),
			isExtraLargeScreen: window.matchMedia(
				`(min-width: ${BREAKPOINTS.extraLargeScreen}px)`,
			),
		};

		const handler = () => {
			const next = {
				isMobile: queries.isMobile.matches,
				isTablet: queries.isTablet.matches,
				isLargeScreen: queries.isLargeScreen.matches,
				isExtraLargeScreen: queries.isExtraLargeScreen.matches,
			};

			setBreakpoints((prev) => {
				if (
					prev.isMobile === next.isMobile &&
					prev.isTablet === next.isTablet &&
					prev.isLargeScreen === next.isLargeScreen &&
					prev.isExtraLargeScreen === next.isExtraLargeScreen
				) {
					return prev;
				}
				return next;
			});
		};

		handler();

		const entries = Object.values(queries);
		for (const mql of entries) {
			mql.addEventListener("change", handler);
		}

		return () => {
			for (const mql of entries) {
				mql.removeEventListener("change", handler);
			}
		};
	}, []);

	return breakpoints;
}

/**
 * Hook to determine if the window width matches a specific breakpoint variant.
 * Optimized to only listen to the specific query requested.
 */
export function useIsMobile(variant: BreakpointVariant = "mobile") {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const queryStr =
			variant === "extraLargeScreen"
				? `(min-width: ${BREAKPOINTS[variant]}px)`
				: `(max-width: ${BREAKPOINTS[variant] - 1}px)`;
		
		const mql = window.matchMedia(queryStr);
		const handler = () => setMatches(mql.matches);
		
		handler();
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, [variant]);

	return matches;
}
