import { useEffect, useSyncExternalStore } from "react";
import { useNavigation, useRouteLoaderData } from "react-router";
import { z } from "zod";
import type { loader as rootLoader } from "~/root";

export const ColorSchemeSchema = z.object({
	colorScheme: z.enum(["light", "dark", "system"]),
	returnTo: z.string().optional(),
});

export type ColorScheme = "light" | "dark" | "system";

// Runs before React hydrates to prevent theme flash
const THEME_SCRIPT = `
(function() {
  try {
    const theme = localStorage.getItem("theme") || "system";
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.backgroundColor = "#09090b";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.backgroundColor = "#ffffff";
    }
  } catch (e) {}
})();
`;

function getThemeFromStorage(): ColorScheme {
	if (typeof window === "undefined") return "system";
	const stored = localStorage.getItem("theme") as ColorScheme | null;
	return stored || "system";
}

function subscribeToThemeChanges(callback: () => void) {
	const handleChange = () => callback();
	window.addEventListener("colorSchemeChange", handleChange);
	return () => window.removeEventListener("colorSchemeChange", handleChange);
}

export function useColorScheme(): ColorScheme {
	const rootLoaderData = useRouteLoaderData<typeof rootLoader>("root");
	const serverColorScheme = rootLoaderData?.colorScheme ?? "system";

	const { formData } = useNavigation();
	const optimisticColorScheme = formData?.has("colorScheme")
		? (formData.get("colorScheme") as ColorScheme)
		: null;

	const clientColorScheme = useSyncExternalStore(
		subscribeToThemeChanges,
		getThemeFromStorage,
		() => serverColorScheme,
	);

	return optimisticColorScheme || clientColorScheme;
}

export function useSetColorScheme() {
	return (colorScheme: ColorScheme) => {
		if (typeof window === "undefined") return;

		localStorage.setItem("theme", colorScheme);

		const isDark =
			colorScheme === "dark" ||
			(colorScheme === "system" &&
				window.matchMedia("(prefers-color-scheme: dark)").matches);

		if (isDark) {
			document.documentElement.classList.add("dark");
			document.documentElement.style.backgroundColor = "#09090b";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.style.backgroundColor = "#ffffff";
		}

		window.dispatchEvent(
			new CustomEvent("colorSchemeChange", { detail: colorScheme }),
		);

		const formData = new FormData();
		formData.append("colorScheme", colorScheme);
		formData.append(
			"returnTo",
			window.location.pathname + window.location.search,
		);

		fetch("/api/color-scheme", {
			method: "POST",
			body: formData,
		}).catch(() => {});
	};
}

export function ColorSchemeScript({ nonce }: { nonce: string }) {
	const colorScheme = useColorScheme();

	useEffect(() => {
		if (colorScheme !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const listener = (e: MediaQueryListEvent) => {
			if (e.matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		};

		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	}, [colorScheme]);

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
				dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
			/>
		</>
	);
}
