"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
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
import { authClient } from "~/lib/auth-client";
import { clearAuthSessionFromLocalStorage } from "~/lib/offline-auth";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function OrgSwitcher({
	organizations,
	selectedOrg,
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
}) {
	const { isMobile } = useSidebar();

	// Find the current organization based on the slug from URL
	const currentOrg = organizations?.find(
		(org) => org.slug === selectedOrg.slug,
	) ?? {
		...selectedOrg,
	};

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
										src={`https://api.dicebear.com/9.x/glass/svg?seed=${currentOrg.name}`}
									/>
									<AvatarFallback className="rounded-lg">
										{currentOrg.name.charAt(0)}
									</AvatarFallback>
								</Avatar>
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{currentOrg.name}</span>
								{/* <span className="truncate text-xs">{currentTeam.plan}</span> */}
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Teams
						</DropdownMenuLabel>

						{organizations?.map((org) => (
							<DropdownMenuItem asChild className="gap-2 p-2" key={org.name}>
								<Link
									to={`/${org.slug}`}
									onClick={async (e) => {
										// Only set active if switching to a different org
										if (currentOrg.id !== org.id) {
											await authClient.organization.setActive({
												organizationSlug: org.slug,
											});
										}
									}}
								>
									<div className="flex size-6 items-center justify-center rounded-md border">
										{/* <team.logo className="size-3.5 shrink-0" /> */}
										<Avatar className="size-3.5 shrink-0 rounded-lg">
											<AvatarImage
												alt={org.name}
												src={`https://api.dicebear.com/9.x/glass/svg?seed=${org.name}`}
											/>
											<AvatarFallback className="rounded-lg">
												{org.name.charAt(0)}
											</AvatarFallback>
										</Avatar>
									</div>
									{org.name}
									<DropdownMenuShortcut>
										{currentOrg.id === org.id && "✓"}
									</DropdownMenuShortcut>
								</Link>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link className="cursor-pointer" to="/settings">
								<div className="flex size-6 items-center justify-center rounded-md border">
									<Plus className="size-4" />
								</div>
								<div className="font-medium text-muted-foreground">
									Settings
								</div>
							</Link>
						</DropdownMenuItem>

						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link className="cursor-pointer" to="/join">
								<div className="flex size-6 items-center justify-center rounded-md border">
									<Plus className="size-4" />
								</div>
								<div className="font-medium text-muted-foreground">
									Add team
								</div>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
