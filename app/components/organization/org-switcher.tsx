"use client";

import {
	BlocksIcon,
	ChevronsUpDown,
	Settings2Icon,
	Users2Icon,
} from "lucide-react";
import { Link } from "react-router";
import { CustomAvatar } from "~/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "~/components/ui/sidebar";
import { authClient } from "~/lib/auth/client";

/* ---------------------------------- Types --------------------------------- */

interface Organization {
	id: string;
	name: string;
	slug: string;
}

interface OrganizationSwitcherProps {
	organizations: Organization[];
	activeOrganization: Organization;
}

/* -------------------------------- Component ------------------------------- */

export function OrgSwitcher({
	organizations,
	activeOrganization,
}: OrganizationSwitcherProps) {
	const { isMobile } = useSidebar();

	const currentOrg = organizations?.find(
		(org) => org.slug === activeOrganization.slug,
	) ?? {
		...activeOrganization,
	};

	/* -------------------------------- Handlers -------------------------------- */

	const handleOrganizationSelect = async (org: Organization) => {
		if (currentOrg.id !== org.id) {
			await authClient.organization.setActive({
				organizationSlug: org.slug,
			});
		}
	};

	/* --------------------------------- Render --------------------------------- */

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							size="default"
						>
							<CustomAvatar
								key={currentOrg.id}
								name={currentOrg.name}
								className="size-6"
							/>

							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{currentOrg.name}</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						sideOffset={6}
					>
						{/* Organization Actions */}
						<DropdownMenuItem asChild className="p-2">
							<Link
								className="cursor-pointer"
								to={`/${currentOrg.slug}/settings`}
							>
								<Settings2Icon className="size-4" />
								<div>Settings</div>
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem asChild className="p-2">
							<Link
								className="cursor-pointer"
								to={`/${currentOrg.slug}/settings/members`}
							>
								<Users2Icon className="size-4" />
								<div>Invite and Manage Users</div>
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem asChild className="p-2">
							<Link className="cursor-pointer" to="/join">
								<BlocksIcon className="size-4" />
								<div>Add Organization</div>
							</Link>
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						{/* Organization List */}
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Organizations
						</DropdownMenuLabel>

						{organizations?.map((org) => (
							<DropdownMenuItem asChild className="p-2" key={org.id}>
								<Link
									to={`/${org.slug}`}
									onClick={() => handleOrganizationSelect(org)}
									className="cursor-pointer"
								>
									<CustomAvatar
										key={org.id}
										name={org.name}
										className="size-5"
									/>
									{org.name}
									<DropdownMenuShortcut>
										{currentOrg.id === org.id && "✓"}
									</DropdownMenuShortcut>
								</Link>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
