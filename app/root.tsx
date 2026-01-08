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
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap",
	},
	{
		rel: "icon",
		type: "image/png",
		href: "/favicon-96x96.png",
		sizes: "96x96",
	},
	{
		rel: "icon",
		type: "image/svg+xml",
		href: "/favicon.svg",
	},
	{
		rel: "shortcut icon",
		href: "/favicon.ico",
	},
	{
		rel: "apple-touch-icon",
		sizes: "180x180",
		href: "/apple-touch-icon.png",
	},
	{
		rel: "manifest",
		href: "/site.webmanifest",
	},
];

export const meta: Route.MetaFunction = () => [
	{
		title: "KaamSync - Organize Your Work Seamlessly",
	},
	{
		name: "description",
		content:
			"KaamSync helps teams manage tasks, collaborate, and boost productivity all in one place.",
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
		// Register service worker immediately so it installs even on prerendered/static pages
		import("virtual:pwa-register").then(({ registerSW }) => {
			registerSW({ immediate: true });
		});
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
			<body className="min-h-screen overflow-y-auto">
				{children}
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<Toaster closeButton position="bottom-right" theme={colorScheme} />
			</body>
		</html>
	);
}

// TODO: Re-enable a better fallback UI
// export function HydrateFallback() {
// 	return (
// 		<div className="flex h-screen w-screen items-center justify-center bg-background">
// 			<div className="flex flex-col items-center gap-2">
// 				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
// 				<p className="text-muted-foreground text-sm">Loading...</p>
// 			</div>
// 		</div>
// 	);
// }

export default function App() {
	return <Outlet />;
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
