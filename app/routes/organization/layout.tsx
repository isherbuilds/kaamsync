import { useQuery } from "@rocicorp/zero/react";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import { useMemo } from "react";
import {
	data,
	Form,
	isRouteErrorResponse,
	Outlet,
	redirect,
	useRouteError,
} from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import { queries } from "zero/queries";
import { CACHE_LONG, CACHE_USER_DATA } from "zero/query-cache-policy";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { ZeroInit } from "~/components/providers/zero-init";
import { Button } from "~/components/ui/button";
import { SidebarProvider } from "~/components/ui/sidebar";
import { useServiceWorker } from "~/hooks/use-service-worker";
import type { AuthSession } from "~/lib/auth/client";
import { authClient } from "~/lib/auth/client";
import { getAuthSession, isOffline, saveAuthSession } from "~/lib/auth/offline";
import { getServerSession } from "~/lib/auth/server";
import { getSubscription, getSubscriptionSWR } from "~/lib/billing/offline";
import { fetchOrgSubscription } from "~/lib/billing/service";
import type { Route } from "./+types/layout";

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

let lastOrgSlug: string | undefined;
let hasInitializedOrg = false;

export async function clientLoader({
	params,
	serverLoader,
}: Route.ClientLoaderArgs) {
	const orgSlug = params.orgSlug as string;
	const offline = isOffline();

	let authSession = getAuthSession();
	if (offline) {
		const cachedSubscription = getSubscription(orgSlug);
		if (authSession && cachedSubscription) {
			return { authSession, orgSlug, subscription: cachedSubscription };
		}
		throw new Response("Offline with no cached data", { status: 503 });
	}

	const needsOrgUpdate = orgSlug && orgSlug !== lastOrgSlug;
	if (
		authSession?.session.activeOrganizationId &&
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
		} catch (error) {
			console.error("Failed to set active organization", error);
			if (!isOffline()) throw error;
		}
	}

	let subscription = null as Awaited<ReturnType<typeof getSubscriptionSWR>>;

	try {
		const serverData = await serverLoader();

		authSession = serverData.authSession;
		saveAuthSession(authSession);

		subscription = await getSubscriptionSWR(
			async () => serverData.subscription,
			orgSlug,
		);
	} catch (err) {
		if (err instanceof Response) throw err;

		if (authSession && !subscription) {
			subscription = getSubscription(orgSlug);

			if (authSession && subscription) {
				return { authSession, orgSlug, subscription };
			}
		}

		if (isOffline()) {
			throw new Response("Offline with no cached data", { status: 503 });
		}

		throw err;
	}

	if (!authSession || !subscription) {
		throw new Response(
			isOffline() ? "Offline with no cached data" : "Failed to load data",
			{ status: 503 },
		);
	}

	return { authSession, orgSlug, subscription };
}

clientLoader.hydrate = true as const;

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

	const [orgsData] = useQuery(queries.getOrganizationList(), CACHE_LONG);
	const [teamsData] = useQuery(queries.getTeamsList(), CACHE_USER_DATA);

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
				<div className="v-stack gap-1.5">
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
