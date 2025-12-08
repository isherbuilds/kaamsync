import { useQuery } from "@rocicorp/zero/react";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
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

// Track org state to avoid redundant server calls
let lastOrgSlug: string | undefined;
let hasInitializedOrg = false;

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
	async ({ context, params }, next) => {
		const orgSlug = params.orgSlug;

		// Get session with SWR caching
		const baseSession = await getAuthSessionSWR(() => authClient.getSession(), {
			refreshMaxAgeMs: 60_000,
			blockOnEmpty: true,
		});

		if (!baseSession?.session) throw redirect("/login");

		let finalSession = baseSession;
		const needsOrgUpdate = orgSlug && orgSlug !== lastOrgSlug;
		const orgAlreadyMatches =
			baseSession.session.activeOrganizationId &&
			!needsOrgUpdate &&
			!hasInitializedOrg;

		if (orgAlreadyMatches) {
			lastOrgSlug = orgSlug;
			hasInitializedOrg = true;
		} else if (needsOrgUpdate) {
			try {
				await authClient.organization.setActive({ organizationSlug: orgSlug });
				lastOrgSlug = orgSlug;
				hasInitializedOrg = true;
				finalSession =
					(await getAuthSessionSWR(() => authClient.getSession(), {
						forceNetwork: true,
						blockOnEmpty: true,
					})) ?? baseSession;
			} catch {
				// Offline fallback - use cached session
				finalSession = baseSession;
			}
		}

		context.set(clientAuthContext, finalSession);
		await next();
	},
];

export async function clientLoader({
	params,
	context,
}: Route.ClientLoaderArgs) {
	const authSession = context.get(clientAuthContext);
	return {
		authSession,
		orgSlug: params.orgSlug,
		queryCtx: {
			sub: authSession.user.id,
			activeOrganizationId: authSession.session.activeOrganizationId || "",
		},
	};
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

	// Preload workspaces for instant switching - direct map is O(n) and cheap
	const activeOrgId = queryCtx.activeOrganizationId;

	useEffect(() => {
		if (workspacesData.length > 0 && activeOrgId) {
			preloadAllWorkspaces(
				z,
				{ sub: queryCtx.sub, activeOrganizationId: activeOrgId },
				workspacesData.map((w) => w.id),
			);
		}
	}, [z, queryCtx.sub, activeOrgId, workspacesData]);

	// Direct find - O(n) on small array, no memoization overhead needed
	const selectedOrg = orgsData.find((o) => o.slug === orgSlug);

	return (
		<SidebarProvider>
			<ClientOnly fallback={<SidebarSkeleton />}>
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

function SidebarSkeleton() {
	return (
		<div className="hidden w-64 flex-col items-center justify-center bg-sidebar p-4 lg:flex">
			<Spinner className="size-5" />
		</div>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const isDev = import.meta.env.DEV;

	const is404 = isRouteErrorResponse(error) && error.status === 404;
	const message = is404 ? "Organization Not Found" : "Organization Error";
	const details = is404
		? "The requested organization could not be found."
		: "Failed to load organization.";

	return (
		<div className="flex h-screen w-full items-center justify-center bg-background p-4">
			<div className="flex max-w-md flex-col items-center gap-4 text-center">
				<div className="rounded-full bg-destructive/10 p-3">
					<AlertCircle className="size-6 text-destructive" />
				</div>
				<div className="space-y-1">
					<h1 className="font-semibold text-lg">{message}</h1>
					<p className="text-muted-foreground text-sm">{details}</p>
				</div>
				{isDev && error instanceof Error && error.stack && (
					<pre className="max-h-48 w-full overflow-auto rounded-lg bg-destructive/5 p-3 text-left text-destructive text-xs">
						<code>{error.stack}</code>
					</pre>
				)}
				<div className="flex gap-2">
					<Button asChild variant="outline">
						<a href="/">Home</a>
					</Button>
					<Button asChild>
						<a href="/logout">Sign Out</a>
					</Button>
				</div>
			</div>
		</div>
	);
}
