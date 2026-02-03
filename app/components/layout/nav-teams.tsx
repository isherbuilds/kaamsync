"use client";

import { useZero } from "@rocicorp/zero/react";
import Cog from "lucide-react/dist/esm/icons/cog";
import Folder from "lucide-react/dist/esm/icons/folder";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Plus from "lucide-react/dist/esm/icons/plus";
import Users2Icon from "lucide-react/dist/esm/icons/users-2";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";
import { preloadTeam } from "zero/preload";
import { CreateTeamDialog } from "~/components/teams/create-team-dialog";
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

interface TeamInfo {
	id: string;
	name: string;
	code: string;
	slug: string;
}

interface NavTeamsProps {
	teams: TeamInfo[];
	orgSlug: string;
}

export function NavTeams({ teams, orgSlug }: NavTeamsProps) {
	const { isMobile, setOpenMobile } = useSidebar();
	const [createTeamOpen, setCreateTeamOpen] = useState(false);
	const params = useParams();
	const activeCode = params.teamCode;
	const z = useZero();

	const handleTeamHover = useCallback(
		(teamId: string) => {
			preloadTeam(z, teamId);
		},
		[z],
	);

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
					{teams?.map((team) => {
						const isActive = team.code === activeCode;
						return (
							<SidebarMenuItem key={team.id}>
								<SidebarMenuButton isActive={isActive} asChild>
									<Link
										to={`/${orgSlug}/${team.code}`}
										prefetch="intent"
										onMouseEnter={() => handleTeamHover(team.id)}
										onFocus={() => handleTeamHover(team.id)}
										onClick={
											isMobile
												? () => setTimeout(() => setOpenMobile(false), 50)
												: undefined
										}
									>
										{isActive ? (
											<FolderOpen className="size-4" />
										) : (
											<Folder className="size-4" />
										)}
										{team.name}
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
										className="rounded-md border"
										side={isMobile ? "bottom" : "right"}
									>
										<DropdownMenuLabel>{team.name}</DropdownMenuLabel>
										<hr />
										<DropdownMenuItem asChild>
											<Link
												to={`/${orgSlug}/settings/teams/${team.code}/members`}
												prefetch="intent"
												className="flex w-full items-center"
											>
												<Users2Icon className="text-muted-foreground" />
												<span>Members</span>
											</Link>
										</DropdownMenuItem>

										<DropdownMenuItem asChild>
											<Link
												to={`/${orgSlug}/settings/teams/${team.code}`}
												prefetch="intent"
												className="flex w-full items-center"
											>
												<Cog className="text-muted-foreground" />
												<span>Settings</span>
											</Link>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroup>

			<CreateTeamDialog
				open={createTeamOpen}
				onOpenChange={setCreateTeamOpen}
			/>
		</>
	);
}
