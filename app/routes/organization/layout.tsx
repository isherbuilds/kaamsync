import { useQuery } from "@rocicorp/zero/react";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
	createContext,
	isRouteErrorResponse,
	Outlet,
	redirect,
	useRouteError,
} from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import { preloadAllWorkspaces } from "zero/preload";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_NAV } from "zero/query-cache-policy";
import { AppSidebar } from "~/components/app-sidebar";
import { Button } from "~/components/ui/button";
import { SidebarProvider } from "~/components/ui/sidebar";
import { Spinner } from "~/components/ui/spinner";
import { useZ } from "~/hooks/use-zero-cache";
import type { AuthSession } from "~/lib/auth-client";
import { authClient } from "~/lib/auth-client";
import { getAuthSessionSWR } from "~/lib/offline-auth";
import type { Route } from "./+types/layout";

export const clientAuthContext = createContext<AuthSession>();
// Track last organization slug to avoid redundant server calls
let lastOrgSlug: string | undefined;
// Track if we've already set the active org on initial load
let hasInitializedOrg = false;

// Debug logging - disable in production for performance
const DEBUG_LAYOUT = false;
function layoutLog(msg: string, ...args: unknown[]) {
	if (DEBUG_LAYOUT) console.log(msg, ...args);
}

// Framework mode
export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
	async ({ context, params }, next) => {
		const middlewareStart = DEBUG_LAYOUT ? performance.now() : 0;
		layoutLog("[Layout Middleware] START");

		const orgSlug = params.orgSlug;

		// Prime from cache with SWR background refresh
		const baseSession = await getAuthSessionSWR(() => authClient.getSession(), {
			refreshMaxAgeMs: 60_000,
			blockOnEmpty: true,
		});
		// if (!baseSession) {
		// 	try {
		// 		const result = await authClient.getSession();
		// 		if (result?.data) {
		// 			baseSession = result.data;
		// 			saveAuthSessionToLocalStorage(result.data);
		// 		}
		// 	} catch {
		// 		baseSession = getAuthSessionFromLocalStorage();
		// 	}
		// }

		if (!baseSession?.session) {
			throw redirect("/login");
		}

		let finalSession = baseSession;

		// Check if we need to set active org
		const needsOrgUpdate = orgSlug && orgSlug !== lastOrgSlug;
		// On first load after login, check if org already matches
		const orgAlreadyMatches =
			baseSession.session.activeOrganizationId &&
			!needsOrgUpdate &&
			!hasInitializedOrg;

		layoutLog(
			`[Layout Middleware] needsOrgUpdate: ${needsOrgUpdate}, orgAlreadyMatches: ${orgAlreadyMatches}`,
		);

		if (orgAlreadyMatches) {
			// Skip redundant setActive call on initial load
			lastOrgSlug = orgSlug;
			hasInitializedOrg = true;
		} else if (needsOrgUpdate) {
			try {
				const setActiveStart = DEBUG_LAYOUT ? performance.now() : 0;
				await authClient.organization.setActive({ organizationSlug: orgSlug });
				layoutLog(
					`[Layout Middleware] setActive took ${(performance.now() - setActiveStart).toFixed(2)}ms`,
				);
				lastOrgSlug = orgSlug;
				hasInitializedOrg = true;
				finalSession =
					(await getAuthSessionSWR(() => authClient.getSession(), {
						forceNetwork: true,
						blockOnEmpty: true,
					})) ?? baseSession;
			} catch (error) {
				if (import.meta.env.DEV) {
					console.warn("Failed to update active org (offline?):", error);
				}
				// Fall back to the cached session
				finalSession = baseSession;
			}
		}

		context.set(clientAuthContext, finalSession);

		const nextStart = DEBUG_LAYOUT ? performance.now() : 0;
		await next();
		layoutLog(
			`[Layout Middleware] next() took ${(performance.now() - nextStart).toFixed(2)}ms`,
		);
		layoutLog(
			`[Layout Middleware] TOTAL: ${(performance.now() - middlewareStart).toFixed(2)}ms`,
		);
	},
];

export async function clientLoader({
	params,
	context,
}: Route.ClientLoaderArgs) {
	layoutLog("[Layout clientLoader] START");

	const orgSlug = params.orgSlug;
	const authSession = context.get(clientAuthContext);

	const queryCtx = {
		sub: authSession.user.id,
		activeOrganizationId: authSession.session.activeOrganizationId || "",
	};

	return { authSession, orgSlug, queryCtx };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const { authSession, orgSlug, queryCtx } = loaderData;
	const z = useZ();

	const [orgsData] = useQuery(
		queries.getOrganizationList(queryCtx),
		CACHE_LONG,
	);

	const [workspacesData] = useQuery(
		queries.getWorkspacesList(queryCtx),
		CACHE_NAV,
	);

	// Preload all workspaces once the list is available
	// This ensures instant workspace switching by pre-syncing data
	// Only trigger when workspace IDs actually change (not on every render)
	const workspaceIds = useMemo(
		() => workspacesData.map((w) => w.id),
		[workspacesData],
	);

	// Extract activeOrganizationId to stabilize the dependency
	const activeOrgId = queryCtx.activeOrganizationId;

	useEffect(() => {
		if (workspaceIds.length > 0 && activeOrgId) {
			preloadAllWorkspaces(
				z,
				{ sub: queryCtx.sub, activeOrganizationId: activeOrgId },
				workspaceIds,
			);
		}
	}, [z, queryCtx.sub, activeOrgId, workspaceIds]);

	const selectedOrg = useMemo(
		() => orgsData.find((o) => o.slug === orgSlug),
		[orgsData, orgSlug],
	);

	return (
		<SidebarProvider>
			<ClientOnly
				fallback={
					<div className="hidden w-80 flex-col items-center justify-center bg-sidebar p-4 lg:flex">
						<Spinner className="size-5" />
					</div>
				}
			>
				{() => (
					<AppSidebar
						authUser={authSession.user}
						selectedOrg={selectedOrg ?? { id: "", name: "", slug: "" }}
						organizations={orgsData}
						workspaces={workspacesData}
						queryCtx={queryCtx}
					/>
				)}
			</ClientOnly>
			<div className="h-screen w-full overflow-hidden bg-card">
				<Outlet />
			</div>
		</SidebarProvider>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const isDev = import.meta.env.DEV;

	let message = "Organization Error";
	let details = "Failed to load organization.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "Organization Not Found" : "Error";
		details =
			error.status === 404
				? "The requested organization could not be found."
				: error.statusText || details;
	} else if (isDev && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<div className="flex h-screen w-full items-center justify-center bg-background">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
				<div className="rounded-full bg-destructive/10 p-3">
					<AlertCircle className="size-6 text-destructive" />
				</div>

				<div className="space-y-1">
					<h1 className="font-semibold text-lg">{message}</h1>
					<p className="text-muted-foreground text-sm">{details}</p>
				</div>

				{isDev && stack && (
					<pre className="max-h-96 w-full overflow-x-auto overflow-y-auto rounded-lg bg-destructive/5 p-4 text-left text-destructive text-xs">
						<code>{stack}</code>
					</pre>
				)}

				<div className="flex gap-2">
					<Button asChild variant="outline">
						<a href="/">Back to Home</a>
					</Button>
					<Button asChild>
						<a href="/logout">Sign Out</a>
					</Button>
				</div>
			</div>
		</div>
	);
}
