"use client";

import { Cog, MoreHorizontal, Plus, Users2Icon } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "~/components/ui/sidebar";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import { StableLink } from "./stable-link";

export function NavWorkspaces({
	workspaces,
	orgSlug,
}: {
	workspaces: {
		id: string;
		name: string;
		code: string;
		slug: string;
	}[];
	orgSlug: string;
}) {
	const { isMobile, setOpenMobile } = useSidebar();
	const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
	const params = useParams();
	const activeCode = params.workspaceCode;

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel className="relative">
					<span>Workspaces</span>
					<SidebarMenuAction onClick={() => setCreateWorkspaceOpen(true)}>
						<Plus />
						<span className="sr-only">Create Workspace</span>
					</SidebarMenuAction>
				</SidebarGroupLabel>
				<SidebarMenu>
					{workspaces?.map((workspace) => (
						<SidebarMenuItem key={workspace.id}>
							<SidebarMenuButton
								tooltip={workspace.name}
								isActive={workspace.code === activeCode}
								asChild
							>
								<StableLink
									to={`/${orgSlug}/${workspace.code}`}
									prefetch="intent"
									onClick={() => setTimeout(() => setOpenMobile(false), 100)}
									viewTransition
								>
									{workspace.name}
								</StableLink>
							</SidebarMenuButton>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuAction>
										<MoreHorizontal />
										<span className="sr-only">More</span>
									</SidebarMenuAction>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align={isMobile ? "end" : "start"}
									className="rounded-md border"
									side={isMobile ? "bottom" : "right"}
								>
									<DropdownMenuLabel>{workspace.name}</DropdownMenuLabel>
									<hr />
									<DropdownMenuItem asChild>
										<StableLink
											to={`/${orgSlug}/settings/workspaces/${workspace.code}/members`}
											prefetch="intent"
											className="flex w-full items-center"
										>
											<Users2Icon className="text-muted-foreground" />
											<span>Members</span>
										</StableLink>
									</DropdownMenuItem>

									<DropdownMenuItem asChild>
										<StableLink
											to={`/${orgSlug}/settings/workspaces/${workspace.code}`}
											prefetch="intent"
											className="flex w-full items-center"
										>
											<Cog className="text-muted-foreground" />
											<span>Settings</span>
										</StableLink>
									</DropdownMenuItem>
									{/* <DropdownMenuSeparator />
									<DropdownMenuItem>
										<Trash2 className="text-muted-foreground" />
										<span>Delete Workspace</span>
									</DropdownMenuItem> */}
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>

			<CreateWorkspaceDialog
				open={createWorkspaceOpen}
				onOpenChange={setCreateWorkspaceOpen}
			/>
		</>
	);
}
