import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigation, useRouteLoaderData } from "react-router";
import { z } from "zod";
import type { loader as rootLoader } from "~/root";

export const ColorSchemeSchema = z.object({
	colorScheme: z.enum(["light", "dark", "system"]),
	returnTo: z.string().optional(),
});

export type ColorScheme = z.infer<typeof ColorSchemeSchema>["colorScheme"];

/**
 * This hook is used to get the color scheme from the fetcher or the root loader
 * @returns The color scheme
 */
export function useColorScheme(): ColorScheme {
	const rootLoaderData = useRouteLoaderData<typeof rootLoader>("root");
	const rootColorScheme = rootLoaderData?.colorScheme ?? "system";

	const { formData } = useNavigation();
	const optimisticColorScheme = formData?.has("colorScheme")
		? (formData.get("colorScheme") as ColorScheme)
		: null;

	// Track local storage changes for offline support
	const [localColorScheme, setLocalColorScheme] = useState<ColorScheme | null>(
		null,
	);

	useEffect(() => {
		// Initialize from localStorage on mount
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("theme") as ColorScheme | null;
			if (stored) {
				setLocalColorScheme(stored);
			}
		}

		// Listen for color scheme changes
		const handleColorSchemeChange = (e: Event) => {
			const customEvent = e as CustomEvent<ColorScheme>;
			setLocalColorScheme(customEvent.detail);
		};

		window.addEventListener("colorSchemeChange", handleColorSchemeChange);
		return () =>
			window.removeEventListener("colorSchemeChange", handleColorSchemeChange);
	}, []);

	// Priority: optimistic > local storage > root loader
	return optimisticColorScheme || localColorScheme || rootColorScheme;
}

/**
 * This hook is used to set the color scheme on the document element
 * @returns The submit function
 */
export function useSetColorScheme() {
	const location = useLocation();

	return (colorScheme: ColorScheme) => {
		// Optimistically update the UI and persist to local storage
		if (typeof document !== "undefined") {
			localStorage.setItem("theme", colorScheme);

			// Dispatch custom event to notify all components
			window.dispatchEvent(
				new CustomEvent("colorSchemeChange", { detail: colorScheme }),
			);

			if (colorScheme === "dark") {
				document.documentElement.classList.add("dark");
			} else if (colorScheme === "light") {
				document.documentElement.classList.remove("dark");
			} else {
				// system
				if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
					document.documentElement.classList.add("dark");
				} else {
					document.documentElement.classList.remove("dark");
				}
			}
		}

		// Fire and forget network request to sync cookie
		try {
			const formData = new FormData();
			formData.append("colorScheme", colorScheme);
			formData.append("returnTo", location.pathname + location.search);

			fetch("/api/color-scheme", {
				method: "POST",
				body: formData,
			}).catch(() => {
				// Ignore network errors (offline support)
			});
		} catch (_e) {
			// Ignore construction errors
		}
	};
}

/**
 * This component is used to set the color scheme on the document element
 * @param nonce The nonce to use for the script
 * @returns The script element
 */
export function ColorSchemeScript({ nonce }: { nonce: string }) {
	const colorScheme = useColorScheme();

	// biome-ignore lint/correctness/useExhaustiveDependencies: false positive
	const script = useMemo(
		() => `
			try {
				let colorScheme = localStorage.getItem("theme") || ${JSON.stringify(colorScheme)};
				let isDark = false;
				if (colorScheme === "system") {
					isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
				} else {
					isDark = colorScheme === "dark";
				}
				
				if (isDark) {
					document.documentElement.classList.add("dark");
					document.documentElement.style.backgroundColor = "#09090b"; // gray-950
				} else {
					document.documentElement.classList.remove("dark");
					document.documentElement.style.backgroundColor = "#ffffff";
				}
			} catch (e) {
				console.error("Theme script failed:", e);
			}
		`,
		[],
		// we don't want this script to ever change
	);

	if (typeof document !== "undefined") {
		// biome-ignore lint/correctness/useHookAtTopLevel: false positive
		useLayoutEffect(() => {
			// We need to handle system theme changes if the current (local or server) theme is 'system'
			// We'll trust localStorage over the server prop if it exists
			const localTheme = localStorage.getItem("theme") as ColorScheme | null;
			const effectiveTheme = localTheme || colorScheme;

			if (effectiveTheme === "system") {
				function check(media: MediaQueryList | MediaQueryListEvent) {
					if (media.matches) {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}

				const media = window.matchMedia("(prefers-color-scheme: dark)");
				check(media);

				media.addEventListener("change", check);
				return () => media.removeEventListener("change", check);
			}
		}, [colorScheme]);
	}

	return (
		<>
			<meta
				name="theme-color"
				media="(prefers-color-scheme: light)"
				content={colorScheme === "dark" ? "#09090b" : "#ffffff"}
			/>
			<meta
				name="theme-color"
				media="(prefers-color-scheme: dark)"
				content={colorScheme === "light" ? "#ffffff" : "#09090b"}
			/>
			<script
				nonce={nonce}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: false positive
				dangerouslySetInnerHTML={{
					__html: script,
				}}
			/>
		</>
	);
}
