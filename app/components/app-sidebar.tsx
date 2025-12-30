"use client";

import {
	ChevronLeft,
	CircleCheckBigIcon,
	CreditCard,
	Plug,
	SendIcon,
	Settings,
	Users,
} from "lucide-react";
import { useMatches } from "react-router";

import { NavMain } from "~/components/nav-main";
import { NavUser } from "~/components/nav-user";
import { OrgSwitcher } from "~/components/org-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "~/components/ui/sidebar";
import { ColorSchemeToggle } from "./color-scheme-toggle";
import { NavTeams } from "./nav-teams";

// Main navigation items
const navMain = [
	{
		title: "Tasks",
		url: "/tasks",
		icon: CircleCheckBigIcon,
	},
	{
		title: "Requests",
		url: "/requests",
		icon: SendIcon,
	},
];

const navSettings = [
	{
		title: "Back Home",
		url: "/tasks",
		icon: ChevronLeft,
	},
	{
		title: "General",
		url: "/settings",
		icon: Settings,
	},
	{
		title: "Members",
		url: "/settings/members",
		icon: Users,
	},
	{
		title: "Billing",
		url: "/settings/billing",
		icon: CreditCard,
	},
	{
		title: "Integrations",
		url: "/settings/integrations",
		icon: Plug,
	},
];

export function AppSidebar({
	organizations,
	// membership,
	selectedOrg,
	authUser,
	teams,
	...props
}: {
	organizations: {
		id: string;
		name: string;
		slug: string;
	}[];
	selectedOrg: {
		id: string;
		name: string;
		slug: string;
	};
	authUser: {
		id: string;
		name: string;
		email: string;
		avatar?: string;
	};
	teams: {
		id: string;
		name: string;
		code: string;
		slug: string;
	}[];
} & React.ComponentProps<typeof Sidebar>) {
	const matches = useMatches();
	const isSettings = matches.find(
		(match) => match.id === "routes/organization/settings/layout",
	);

	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<OrgSwitcher organizations={organizations} selectedOrg={selectedOrg} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain
					items={isSettings ? navSettings : navMain}
					orgSlug={selectedOrg.slug}
				/>
				{!isSettings && <NavTeams teams={teams} orgSlug={selectedOrg.slug} />}
			</SidebarContent>
			<SidebarFooter className="flex-row items-center">
				<NavUser user={authUser} />
				<ColorSchemeToggle />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
