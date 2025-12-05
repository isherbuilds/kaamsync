import { useQuery } from "@rocicorp/zero/react";
import {
	MoreVerticalIcon,
	PlusIcon,
	TrashIcon,
	UserPlusIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useParams, useRouteLoaderData } from "react-router";
import { toast } from "sonner";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "~/components/ui/command";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { useZ } from "~/hooks/use-zero-cache";
import { cn } from "~/lib/utils";

export default function WorkspaceMembersPage() {
	const { workspaceCode } = useParams();
	const { queryCtx, authSession } = useRouteLoaderData(
		"routes/organization/layout",
	) as {
		queryCtx: { sub: string; activeOrganizationId: string };
		authSession: { user: { id: string } };
	};
	const z = useZ();

	const [addMemberOpen, setAddMemberOpen] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [selectedRole, setSelectedRole] = useState<
		"manager" | "member" | "viewer"
	>("member");

	// 1. Get Workspace ID
	const [workspace] = useQuery(
		queries.getWorkspaceByCode(queryCtx, workspaceCode!),
		CACHE_LONG,
	);

	// 2. Get Workspace Members
	const [workspaceMembers] = useQuery(
		queries.getWorkspaceMembers(queryCtx, workspace?.id || ""),
		{
			enabled: !!workspace,
			...CACHE_LONG,
		},
	);

	// 3. Get Organization Members (for adding new members)
	const [orgMembers] = useQuery(
		queries.getOrganizationMembers(queryCtx),
		CACHE_LONG,
	);

	// Derived state
	const currentMembership = workspaceMembers?.find(
		(m) => m.userId === authSession.user.id,
	);
	const isManager = currentMembership?.role === "manager";

	const availableOrgMembers = useMemo(() => {
		if (!orgMembers || !workspaceMembers) return [];
		const workspaceMemberIds = new Set(workspaceMembers.map((m) => m.userId));
		return orgMembers.filter((m) => !workspaceMemberIds.has(m.userId));
	}, [orgMembers, workspaceMembers]);

	const handleAddMember = async () => {
		if (!workspace || !selectedUserId) return;

		try {
			await z.mutate.workspace.addMember({
				workspaceId: workspace.id,
				userId: selectedUserId,
				role: selectedRole,
			});
			toast.success("Member added successfully");
			setAddMemberOpen(false);
			setSelectedUserId(null);
			setSelectedRole("member");
		} catch (error) {
			toast.error("Failed to add member");
			console.error(error);
		}
	};

	const handleUpdateRole = async (
		userId: string,
		role: "manager" | "member" | "viewer",
	) => {
		if (!workspace) return;
		try {
			await z.mutate.workspace.updateMemberRole({
				workspaceId: workspace.id,
				userId,
				role,
			});
			toast.success("Role updated successfully");
		} catch (error) {
			toast.error("Failed to update role");
			console.error(error);
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (!workspace) return;
		if (!confirm("Are you sure you want to remove this member?")) return;

		try {
			await z.mutate.workspace.removeMember({
				workspaceId: workspace.id,
				userId,
			});
			toast.success("Member removed successfully");
		} catch (error) {
			toast.error("Failed to remove member");
			console.error(error);
		}
	};

	if (!workspace) {
		return <div className="p-8 text-center">Loading workspace...</div>;
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="flex flex-col gap-4 rounded-xl border bg-card text-card-foreground shadow">
				<div className="flex flex-col space-y-1.5 p-6">
					<div className="flex flex-row items-center justify-between">
						<div>
							<h3 className="font-semibold leading-none tracking-tight">
								Workspace Members
							</h3>
							<p className="text-muted-foreground text-sm">
								Manage access to the {workspace.name} workspace
							</p>
						</div>
						{isManager && (
							<Dialog onOpenChange={setAddMemberOpen} open={addMemberOpen}>
								<DialogTrigger asChild>
									<Button size="sm">
										<UserPlusIcon className="h-4 w-4" />
										Add Member
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Add Member to Workspace</DialogTitle>
										<DialogDescription>
											Select a member from your organization to add to this
											workspace.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
												Member
											</label>
											<Popover>
												<PopoverTrigger asChild>
													<Button
														className={cn(
															"w-full justify-between",
															!selectedUserId && "text-muted-foreground",
														)}
														role="combobox"
														variant="outline"
													>
														{selectedUserId
															? orgMembers?.find(
																	(m) => m.userId === selectedUserId,
																)?.user?.name
															: "Select member..."}
														<PlusIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
													</Button>
												</PopoverTrigger>
												<PopoverContent className="w-[300px] p-0">
													<Command>
														<CommandInput placeholder="Search members..." />
														<CommandList>
															<CommandEmpty>No members found.</CommandEmpty>
															<CommandGroup>
																{availableOrgMembers.map((member) => (
																	<CommandItem
																		key={member.userId}
																		onSelect={() => {
																			setSelectedUserId(member.userId);
																		}}
																		value={
																			member.user?.name ||
																			member.user?.email ||
																			""
																		}
																	>
																		<div className="flex items-center gap-2">
																			<Avatar className="h-6 w-6">
																				<AvatarImage
																					src={member.user?.image ?? undefined}
																				/>
																				<AvatarFallback>
																					{member.user?.name?.[0]}
																				</AvatarFallback>
																			</Avatar>
																			<span>
																				{member.user?.name ||
																					member.user?.email}
																			</span>
																		</div>
																	</CommandItem>
																))}
															</CommandGroup>
														</CommandList>
													</Command>
												</PopoverContent>
											</Popover>
										</div>
										<div className="space-y-2">
											<label className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
												Role
											</label>
											<div className="flex gap-2">
												{(["member", "viewer", "manager"] as const).map((r) => (
													<Button
														className="flex-1 capitalize"
														key={r}
														onClick={() => setSelectedRole(r)}
														variant={selectedRole === r ? "default" : "outline"}
													>
														{r}
													</Button>
												))}
											</div>
										</div>
										<Button
											className="w-full"
											disabled={!selectedUserId}
											onClick={handleAddMember}
										>
											Add Member
										</Button>
									</div>
								</DialogContent>
							</Dialog>
						)}
					</div>
				</div>
				<div className="p-6 pt-0">
					{!workspaceMembers && (
						<div className="py-8 text-center text-muted-foreground text-sm">
							Loading members...
						</div>
					)}
					{workspaceMembers && workspaceMembers.length === 0 && (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No members found
						</div>
					)}
					{workspaceMembers && workspaceMembers.length > 0 && (
						<div className="divide-y">
							{workspaceMembers.map((member) => (
								<div
									className="flex items-center justify-between py-3"
									key={member.id}
								>
									<div className="flex items-center gap-2">
										<Avatar className="h-10 w-10">
											<AvatarImage
												alt={member.user?.name || member.user?.email || "User"}
												src={
													member.user?.image ??
													`https://api.dicebear.com/9.x/glass/svg?seed=${member.user?.name || member.user?.email}`
												}
											/>
											<AvatarFallback>
												{(member.user?.name || member.user?.email)
													?.charAt(0)
													.toUpperCase()}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="font-medium">
												{member.user?.name || "Unknown"}
											</div>
											<div className="text-muted-foreground text-sm">
												{member.user?.email}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{member.role}</Badge>
										{isManager && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button size="icon" variant="ghost">
														<MoreVerticalIcon className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() =>
															handleUpdateRole(member.userId, "manager")
														}
													>
														Make Manager
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleUpdateRole(member.userId, "member")
														}
													>
														Make Member
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleUpdateRole(member.userId, "viewer")
														}
													>
														Make Viewer
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive"
														onClick={() => handleRemoveMember(member.userId)}
													>
														<TrashIcon className="h-4 w-4" />
														Remove
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
