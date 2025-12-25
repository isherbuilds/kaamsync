import { ChevronLeft } from "lucide-react";
import { Link, Outlet } from "react-router";
import { SidebarTrigger } from "~/components/ui/sidebar";

import type { Route } from "./+types/layout";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Settings - ${params.orgSlug}`,
	},
];

export default function OrganizationSettingsLayout() {
	// const { authSession } = useOrgLoaderData();

	return (
		<main className="flex h-full flex-col">
			<div className="flex h-12 items-center gap-2 border-b bg-background px-4 lg:hidden">
				<SidebarTrigger />
				<Link to="../" className="flex items-center gap-2">
					<ChevronLeft className="size-4" />
					<h5 className="font-semibold">Settings</h5>
				</Link>
			</div>
			<div className="flex-1 overflow-y-auto p-6">
				<div>
					<Outlet />
				</div>
			</div>
		</main>
	);
}
