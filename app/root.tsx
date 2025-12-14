import { useEffect } from "react";
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getToast } from "remix-toast";
import { Toaster } from "sonner";
import { GeneralErrorBoundary } from "./components/error-boundary";
import { ZeroInit } from "./components/zero-init";
import { useNonce } from "./hooks/use-nonce";
import {
	ColorSchemeScript,
	useColorScheme,
} from "./lib/color-scheme/components";
import { parseColorScheme } from "./lib/color-scheme/server";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
	},
];

export async function loader({ request }: Route.LoaderArgs) {
	const colorScheme = await parseColorScheme(request);
	const { toast, headers } = await getToast(request);

	return data({ colorScheme, toast }, { headers });
}

export const shouldRevalidate = ({
	formAction,
}: ShouldRevalidateFunctionArgs) => {
	// Only revalidate when color scheme change is requested
	return formAction === "/api/color-scheme";
};

export function Layout({ children }: { children: React.ReactNode }) {
	const colorScheme = useColorScheme();
	const nonce = useNonce();

	useEffect(() => {
		if (typeof window === "undefined" || import.meta.env.DEV) return;
		const register = () =>
			import("virtual:pwa-register").then(({ registerSW }) => {
				registerSW({ immediate: true });
			});

		const useIdle = typeof window.requestIdleCallback === "function";
		// Defer SW registration to idle to keep first paint responsive.
		const handle = useIdle
			? window.requestIdleCallback(register, { timeout: 2000 })
			: window.setTimeout(register, 1000);

		return () => {
			if (useIdle && typeof window.cancelIdleCallback === "function") {
				window.cancelIdleCallback(handle as number);
			} else {
				window.clearTimeout(handle as number);
			}
		};
	}, []);

	return (
		<html
			lang="en"
			className={`${colorScheme === "dark" ? "dark" : ""} touch-manipulation overflow-x-hidden`}
			suppressHydrationWarning
		>
			<head>
				<meta charSet="utf-8" />
				<meta
					content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
					name="viewport"
				/>
				<ColorSchemeScript nonce={nonce} />
				<Meta />
				{/* {import.meta.env.DEV && (
					<script
						crossOrigin="anonymous"
						src="//unpkg.com/react-scan/dist/auto.global"
					/>
				)} */}
				<Links />
			</head>
			<body className="overflow-hidden">
				<ZeroInit>{children}</ZeroInit>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<Toaster closeButton position="bottom-right" theme={colorScheme} />
			</body>
		</html>
	);
}

export function HydrateFallback() {
	return (
		<div className="flex h-screen w-screen items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-2">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				<p className="text-sm text-muted-foreground">Loading...</p>
			</div>
		</div>
	);
}

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
