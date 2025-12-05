"use client";

import { Folder, Forward, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useMatches } from "react-router";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
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
import { Button } from "./ui/button";

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
	const { isMobile } = useSidebar();
	const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
	const matches = useMatches();

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel>
					<span>Workspaces</span>
					<Button
						size="sm"
						variant="ghost"
						className="ml-auto size-5 p-0"
						onClick={() => setCreateWorkspaceOpen(true)}
					>
						<Plus className="size-4" />
						<span className="sr-only">Create Workspace</span>
					</Button>
				</SidebarGroupLabel>
				<SidebarMenu>
					{workspaces?.map((workspace) => {
						// Simple inline check - no need for memoization overhead
						const isActive = matches.some(
							(m) => m.pathname === `/${orgSlug}/${workspace.code}`,
						);
						return (
							<SidebarMenuItem key={workspace.id}>
								<SidebarMenuButton
									tooltip={workspace.name}
									isActive={isActive}
									asChild
								>
									<Link to={`/${orgSlug}/${workspace.code}`} prefetch="intent">
										{workspace.name}
									</Link>
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
										className="min-w-48 rounded-lg"
										side={isMobile ? "bottom" : "right"}
									>
										<DropdownMenuItem>
											<Folder className="text-muted-foreground" />
											<span>Members</span>
										</DropdownMenuItem>
										<DropdownMenuItem>
											<Forward className="text-muted-foreground" />
											<span>Settings</span>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem>
											<Trash2 className="text-muted-foreground" />
											<span>Delete Workspace</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroup>

			<CreateWorkspaceDialog
				open={createWorkspaceOpen}
				onOpenChange={setCreateWorkspaceOpen}
			/>
		</>
	);
}
