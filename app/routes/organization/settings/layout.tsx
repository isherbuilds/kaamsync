import { ChevronLeft } from "lucide-react";
import { Link, Outlet } from "react-router";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { useOrgLoaderData } from "~/hooks/use-loader-data";

import type { Route } from "./+types/layout";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Settings - ${params.orgSlug}`,
	},
];

export default function OrganizationSettingsLayout() {
	const { authSession } = useOrgLoaderData();

	return (
		<main className="w-full h-full">
			<div className="flex items-center gap-2  border-b bg-background px-4 h-12 lg:hidden">
				<SidebarTrigger />
				<Link to="../" className="flex items-center gap-2">
					<ChevronLeft className="size-4" />
					<h5 className="font-semibold">Settings</h5>
				</Link>
			</div>
			<div className="p-6 w-full h-full overflow-auto">
				<Outlet />
			</div>
		</main>
	);
}
