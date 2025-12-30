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
import { CreateTeamDialog } from "./create-team-dialog";
import { StableLink } from "./stable-link";

export function NavTeams({
	teams,
	orgSlug,
}: {
	teams: {
		id: string;
		name: string;
		code: string;
		slug: string;
	}[];
	orgSlug: string;
}) {
	const { isMobile, setOpenMobile } = useSidebar();
	const [createTeamOpen, setCreateTeamOpen] = useState(false);
	const params = useParams();
	const activeCode = params.teamCode;

	return (
		<>
			<SidebarGroup>
				<SidebarGroupLabel className="relative">
					<span>Teams</span>
					<SidebarMenuAction onClick={() => setCreateTeamOpen(true)}>
						<Plus />
						<span className="sr-only">Create Team</span>
					</SidebarMenuAction>
				</SidebarGroupLabel>
				<SidebarMenu>
					{teams?.map((team) => (
						<SidebarMenuItem key={team.id}>
							<SidebarMenuButton
								tooltip={team.name}
								isActive={team.code === activeCode}
								asChild
							>
								<StableLink
									to={`/${orgSlug}/${team.code}`}
									prefetch="intent"
									onClick={
										isMobile
											? () => setTimeout(() => setOpenMobile(false), 100)
											: undefined
									}
									// viewTransition
								>
									{team.name}
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
									<DropdownMenuLabel>{team.name}</DropdownMenuLabel>
									<hr />
									<DropdownMenuItem asChild>
										<StableLink
											to={`/${orgSlug}/settings/teams/${team.code}/members`}
											prefetch="intent"
											className="flex w-full items-center"
										>
											<Users2Icon className="text-muted-foreground" />
											<span>Members</span>
										</StableLink>
									</DropdownMenuItem>

									<DropdownMenuItem asChild>
										<StableLink
											to={`/${orgSlug}/settings/teams/${team.code}`}
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
										<span>Delete Team</span>
									</DropdownMenuItem> */}
								</DropdownMenuContent>
							</DropdownMenu>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroup>

			<CreateTeamDialog
				open={createTeamOpen}
				onOpenChange={setCreateTeamOpen}
			/>
		</>
	);
}
