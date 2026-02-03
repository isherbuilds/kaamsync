"use client";

import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import CircleCheckBigIcon from "lucide-react/dist/esm/icons/circle-check-big";
import CreditCard from "lucide-react/dist/esm/icons/credit-card";
import Plug from "lucide-react/dist/esm/icons/plug";
import SendIcon from "lucide-react/dist/esm/icons/send";
import Settings from "lucide-react/dist/esm/icons/settings";
import Users from "lucide-react/dist/esm/icons/users";
import { useMatches } from "react-router";

import { NavMain } from "~/components/layout/nav-main";
import { NavUser } from "~/components/layout/nav-user";
import { OrgSwitcher } from "~/components/organization/org-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "~/components/ui/sidebar";
import { ColorSchemeToggle } from "./color-scheme-toggle";
import { NavTeams } from "./nav-teams";

// ============================================================================
// Types
// ============================================================================

interface OrganizationInfo {
	id: string;
	name: string;
	slug: string;
}

interface AuthUserInfo {
	id: string;
	name: string;
	email: string;
	image?: string;
}

interface TeamInfo {
	id: string;
	name: string;
	code: string;
	slug: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	organizations: OrganizationInfo[];
	selectedOrg: OrganizationInfo;
	authUser: AuthUserInfo;
	teams: TeamInfo[];
}

// ============================================================================
// Navigation Configuration
// ============================================================================

const NAV_MAIN_ITEMS = [
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

const NAV_SETTINGS_ITEMS = [
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

// ============================================================================
// Component
// ============================================================================

export function AppSidebar({
	organizations,
	selectedOrg,
	authUser,
	teams,
	...props
}: AppSidebarProps) {
	const matches = useMatches();
	const isSettings = matches.some(
		(match) => match.id === "routes/organization/settings/layout",
	);

	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<OrgSwitcher
					organizations={organizations}
					activeOrganization={selectedOrg}
				/>
			</SidebarHeader>
			<SidebarContent>
				<NavMain
					items={isSettings ? NAV_SETTINGS_ITEMS : NAV_MAIN_ITEMS}
					orgSlug={selectedOrg.slug}
				/>
				{!isSettings ? (
					<NavTeams teams={teams} orgSlug={selectedOrg.slug} />
				) : null}
			</SidebarContent>
			<SidebarFooter className="h-stack items-center">
				<NavUser user={authUser} />
				<ColorSchemeToggle />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
