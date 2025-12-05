import { useEffect, useState } from "react";

const BREAKPOINTS = {
	mobile: 768,
	tablet: 1024,
	largeScreen: 1280,
	extraLargeScreen: 1920,
};

type BreakpointVariant = keyof typeof BREAKPOINTS;

/**
 * Hook to determine if the window width matches a specific breakpoint variant.
 * @param variant - The breakpoint variant (e.g., "mobile", "tablet", "extraLargeScreen").
 * @returns True if the window width matches the specified breakpoint variant.
 */
export function useIsMobile(variant: BreakpointVariant = "mobile") {
	const [matches, setMatches] = useState<boolean | undefined>(undefined);

	useEffect(() => {
		const breakpoint = BREAKPOINTS[variant];
		const mql =
			variant === "extraLargeScreen"
				? window.matchMedia(`(min-width: ${breakpoint}px)`)
				: window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

		const onChange = () => {
			setMatches(
				variant === "extraLargeScreen"
					? window.innerWidth >= breakpoint
					: window.innerWidth < breakpoint,
			);
		};

		mql.addEventListener("change", onChange);
		onChange(); // Set the initial value
		return () => mql.removeEventListener("change", onChange);
	}, [variant]);

	return !!matches;
}
