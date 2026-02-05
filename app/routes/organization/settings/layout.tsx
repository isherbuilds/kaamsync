import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import { data, Link, Outlet } from "react-router";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { getServerSession } from "~/lib/auth/server";
import { getOrgLimits } from "~/lib/billing/service";

import type { Route } from "./+types/layout";

export const meta: Route.MetaFunction = ({ params }) => [
	{ title: `Settings - ${params.orgSlug}` },
];

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getServerSession(request);
	const orgId = session?.session?.activeOrganizationId;
	if (!orgId) return data({ limits: null });
	const limits = await getOrgLimits(orgId);
	return data({ limits });
}

export default function OrganizationSettingsLayout() {
	return (
		<main className="v-stack h-full">
			<div className="h-14 h-stack items-center gap-2 border-b bg-background px-4 lg:hidden">
				<SidebarTrigger />
				<Link to="../" className="h-stack items-center gap-2">
					<ChevronLeft className="size-4" />
					<h5 className="font-semibold">Settings</h5>
				</Link>
			</div>
			<div className="flex-1 overflow-y-auto p-6">
				<Outlet />
			</div>
		</main>
	);
}
