import { useQuery } from "@rocicorp/zero/react";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { useMemo } from "react";
import {
	createContext,
	data,
	Form,
	isRouteErrorResponse,
	Outlet,
	redirect,
	useRouteError,
} from "react-router";
import { ClientOnly } from "remix-utils/client-only";
// import { preloadAllTeams } from "zero/preload";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_USER_DATA } from "zero/query-cache-policy";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { ZeroInit } from "~/components/providers/zero-init";
import { Button } from "~/components/ui/button";
import { SidebarProvider } from "~/components/ui/sidebar";
import { useServiceWorker } from "~/hooks/use-service-worker";
import type { AuthSession } from "~/lib/auth/client";
import { authClient } from "~/lib/auth/client";
import {
	getAuthSessionSWR,
	isOffline,
	saveAuthSession,
} from "~/lib/auth/offline";
import { getServerSession } from "~/lib/auth/server";
import { getSubscription, getSubscriptionSWR } from "~/lib/billing/offline";
import { fetchOrgSubscription } from "~/lib/billing/service";
import { requireAuth } from "~/middlewares/auth-guard";
import type { Route } from "./+types/layout";

export const clientAuthContext = createContext<AuthSession>();

export const middleware = [requireAuth];

const EMPTY_ORG = { id: "", name: "", slug: "" };

export async function loader({ params, request }: Route.LoaderArgs) {
	const authSession = await getServerSession(request);

	if (!authSession) {
		throw redirect("/login");
	}

	const orgId = authSession?.session.activeOrganizationId;

	const subscription = await fetchOrgSubscription(orgId);

	return data({
		subscription,
		orgSlug: params.orgSlug,
		authSession,
	});
}

// Track org state to avoid redundant server calls
let lastOrgSlug: string | undefined;
let hasInitializedOrg = false;

export const clientMiddleware: Route.ClientMiddlewareFunction[] = [
	async ({ context, params }, next) => {
		const orgSlug = params.orgSlug;
		const offline = isOffline();

		const baseSession = await getAuthSessionSWR(() => authClient.getSession());

		if (!baseSession?.session) {
			if (offline) {
				throw new Response("Offline with no cached session", { status: 503 });
			}
			throw redirect("/login");
		}

		let finalSession = baseSession;
		const needsOrgUpdate = orgSlug && orgSlug !== lastOrgSlug;

		if (
			baseSession.session.activeOrganizationId &&
			!needsOrgUpdate &&
			!hasInitializedOrg
		) {
			lastOrgSlug = orgSlug;
			hasInitializedOrg = true;
		} else if (needsOrgUpdate && !offline) {
			try {
				await authClient.organization.setActive({ organizationSlug: orgSlug });
				lastOrgSlug = orgSlug;
				hasInitializedOrg = true;
				finalSession =
					(await getAuthSessionSWR(() => authClient.getSession(), {
						forceNetwork: true,
					})) ?? baseSession;
			} catch {
				finalSession = baseSession;
			}
		}

		saveAuthSession(finalSession);
		context.set(clientAuthContext, finalSession);
		await next();
	},
];

export async function clientLoader({
	params,
	context,
	serverLoader,
}: Route.ClientLoaderArgs) {
	const authSession = context.get(clientAuthContext);
	const orgSlug = params.orgSlug as string;

	let subscription = null as Awaited<ReturnType<typeof getSubscriptionSWR>>;
	try {
		const serverData = await serverLoader();
		subscription = await getSubscriptionSWR(
			async () => serverData.subscription,
			orgSlug,
		);
	} catch (err) {
		// If the error is a Response (redirect/401/etc), rethrow so router can handle it.
		if (err instanceof Response) throw err;

		// Only fall back to the local cached subscription when we're offline.
		if (isOffline()) {
			subscription = getSubscription(orgSlug);
		} else {
			// Re-throw non-offline errors so they surface properly.
			throw err;
		}
	}

	if (!authSession || !subscription) {
		throw new Response(
			isOffline() ? "Offline with no cached data" : "Failed to load data",
			{ status: 503 },
		);
	}

	return { authSession, orgSlug, subscription };
}

clientLoader.hydrate = true as const; // `as const` for type inference

// export function HydrateFallback() {
// 	return <SidebarSkeleton />;
// }

export default function ParentLayout({ loaderData }: Route.ComponentProps) {
	const { authSession, orgSlug } = loaderData;

	return (
		<ZeroInit authSession={authSession}>
			<Layout authSession={authSession} orgSlug={orgSlug} />
		</ZeroInit>
	);
}

function Layout({
	authSession,
	orgSlug,
}: {
	authSession: AuthSession;
	orgSlug: string;
}) {
	useServiceWorker();

	// Use optimized cache policies - org data changes less frequently
	const [orgsData] = useQuery(queries.getOrganizationList(), CACHE_LONG);
	const [teamsData] = useQuery(queries.getTeamsList(), CACHE_USER_DATA);

	// const activeOrgId = authSession.session.activeOrganizationId;

	// Memoize team IDs to prevent unnecessary preloading re-runs
	// const teamIds = useMemo(() => teamsData.map((t) => t.id), [teamsData]);

	// Optimize preloading and guard requestIdleCallback for Safari
	// useEffect(() => {
	// 	if (teamIds.length > 0 && activeOrgId) {
	// 		const preloadFn = () => {
	// 			preloadAllTeams(z, teamIds, activeOrgId);
	// 		};

	// 		// Feature-detect requestIdleCallback; fallback to setTimeout if unavailable
	// 		if (typeof window !== "undefined") {
	// 			const w = window as unknown as {
	// 				requestIdleCallback?: (
	// 					cb: () => void,
	// 					opts?: { timeout?: number },
	// 				) => number;
	// 				cancelIdleCallback?: (id: number) => void;
	// 			};

	// 			if (typeof w.requestIdleCallback === "function") {
	// 				const idleId = w.requestIdleCallback(() => {
	// 					preloadFn();
	// 				});

	// 				return () => {
	// 					w.cancelIdleCallback?.(idleId);
	// 				};
	// 			}

	// 			const timeoutId = setTimeout(() => {
	// 				preloadFn();
	// 			}, 0);
	// 			return () => {
	// 				clearTimeout(timeoutId);
	// 			};
	// 		}
	// 	}
	// }, [z, activeOrgId, teamIds]);

	// Memoize org lookup to prevent unnecessary re-renders
	const selectedOrg = useMemo(
		() => orgsData.find((o) => o.slug === orgSlug) ?? EMPTY_ORG,
		[orgsData, orgSlug],
	);

	return (
		<SidebarProvider>
			<ClientOnly>
				{() => (
					<AppSidebar
						authUser={authSession.user}
						selectedOrg={selectedOrg}
						organizations={orgsData}
						teams={teamsData}
					/>
				)}
			</ClientOnly>
			<div className="relative h-dvh w-full overflow-hidden">
				<Outlet />
			</div>
		</SidebarProvider>
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
		<div className="center h-screen w-full bg-background p-4">
			<div className="v-stack max-w-md items-center gap-5 text-center">
				<div className="rounded-full bg-destructive/10 p-3 ring-1 ring-destructive/20">
					<AlertCircle className="size-6 text-destructive" />
				</div>
				<div className="space-y-1.5">
					<h1 className="font-semibold text-lg tracking-tight">{message}</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{details}
					</p>
				</div>
				{isDev && error instanceof Error && error.stack && (
					<pre className="max-h-48 w-full overflow-auto rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-left text-destructive text-xs">
						<code>{error.stack}</code>
					</pre>
				)}
				<div className="flex gap-3 pt-2">
					<Button asChild variant="outline" size="sm">
						<a href="/">Home</a>
					</Button>
					<Form method="post" action="/auth/logout">
						<Button type="submit" size="sm" variant="default">
							Sign Out
						</Button>
					</Form>
				</div>
			</div>
		</div>
	);
}
