import { lazy, Suspense } from "react";
import {
	data,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	type ShouldRevalidateFunctionArgs,
} from "react-router";
import "./app.css";
import { getToast } from "remix-toast";
import { ClientOnly } from "remix-utils/client-only";
import { GeneralErrorBoundary } from "~/components/shared/error-boundary";
import type { Route } from "./+types/root";
import { Spinner } from "./components/ui/spinner";
import { useNonce } from "./hooks/use-nonce";
import {
	ColorSchemeScript,
	useColorScheme,
} from "./lib/color-scheme/components";
import { parseColorScheme } from "./lib/color-scheme/server";

const Toaster = lazy(() =>
	import("sonner").then((module) => ({ default: module.Toaster })),
);

export const links: Route.LinksFunction = () => [
	{
		rel: "icon",
		type: "image/png",
		href: "/favicon-32x32.png",
		sizes: "32x32",
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
		title: "KaamSync | Clear, Trackable Work",
	},
	{
		name: "description",
		content:
			"KaamSync helps teams manage tasks, collaborate, and boost productivity all in one place.",
	},
];

export async function loader({ request }: Route.LoaderArgs) {
	const [colorScheme, toastData] = await Promise.all([
		parseColorScheme(request),
		getToast(request),
	]);
	const { toast, headers } = toastData;

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

	return (
		<html
			lang="en"
			className={`${colorScheme === "dark" ? "dark" : ""} touch-manipulation overflow-hidden`}
			suppressHydrationWarning
		>
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1.0" name="viewport" />
				<Meta />
				<Links />
				<link
					rel="preconnect"
					href="https://fonts.googleapis.com"
					crossOrigin="anonymous"
				/>
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				{/* Preload critical fonts with display=swap to prevent render-blocking */}
				<link
					rel="preload"
					as="style"
					href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&display=swap"
					media="print"
					onLoad={(e) => {
						(e.currentTarget as HTMLLinkElement).media = "all";
					}}
				/>
				<link rel="preconnect" href="https://zero.kaamsync.com" />
				{/* {import.meta.env.DEV && (
					<script
						crossOrigin="anonymous"
						src="//unpkg.com/react-scan/dist/auto.global"
					/>
				)} */}
				<ColorSchemeScript nonce={nonce} />
			</head>
			<body className="h-dvh overflow-auto bg-background text-foreground">
				{children}
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<ClientOnly>
					{() => (
						<Suspense fallback={null}>
							<Toaster
								closeButton
								position="bottom-right"
								theme={colorScheme}
							/>
						</Suspense>
					)}
				</ClientOnly>
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

export function HydrateFallback() {
	return (
		<div className="center flex h-dvh w-full">
			<Spinner className="size-10 text-primary" />
		</div>
	);
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />;
}
