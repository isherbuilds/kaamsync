"use client";

import {
	BlocksIcon,
	ChevronsUpDown,
	CogIcon,
	Users2Icon,
} from "lucide-react";
import { Link } from "react-router";
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
import { Avatar, AvatarFallback, AvatarImage, CustomAvatar } from "~/components/ui/avatar";

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

/* ------------------------------ Avatar Helper ----------------------------- */

function getAvatarUrl(name: string): string {
	return `https://api.dicebear.com/9.x/glass/svg?seed=${name}`;
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
							<div className="flex aspect-square size-6 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Avatar className="size-4 rounded-lg">
									<AvatarImage
										alt={currentOrg.name}
										src={getAvatarUrl(currentOrg.name)}
									/>
									<AvatarFallback className="rounded-lg">
										{currentOrg.name.charAt(0)}
									</AvatarFallback>
								</Avatar>
							</div>
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
								<CogIcon className="size-4" />
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
										avatar={getAvatarUrl(org.name)}
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
