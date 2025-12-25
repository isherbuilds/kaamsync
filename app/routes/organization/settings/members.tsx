import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery } from "@rocicorp/zero/react";
import {
	Mail,
	MoreVertical,
	ShieldCheck,
	Trash2,
	User as UserIcon,
	UserPlus,
	X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z } from "zod";

// UI Components
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	CustomAvatar,
} from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
// Auth & Hooks
import { authClient } from "~/lib/auth-client";

const inviteSchema = z.object({
	email: z.email("Please enter a valid work email"),
	role: z.enum(["admin", "member"]),
});

export default function OrgMembersPage() {
	const { authSession } = useOrgLoaderData();
	const [isPending, startTransition] = useTransition();
	const [inviteOpen, setInviteOpen] = useState(false);

	// Data
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [invites] = useQuery(queries.getOrganizationInvitations(), CACHE_LONG);

	const currentUser = authSession.user;
	const currentMember = members?.find((m) => m.userId === currentUser.id);
	const isAdminOrOwner =
		currentMember?.role === "admin" || currentMember?.role === "owner";

	// Form logic
	const [form, fields] = useForm({
		id: "invite-member",
		defaultValue: { role: "member" },
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: inviteSchema }),
		onSubmit: async (event, { submission }) => {
			event.preventDefault();
			if (submission?.status !== "success") return;

			startTransition(async () => {
				const { error } = await authClient.organization.inviteMember({
					email: submission.value.email,
					role: submission.value.role,
				});

				if (error) {
					toast.error(error.message || "Failed to send invitation");
				} else {
					toast.success(`Invitation sent to ${submission.value.email}`);
					setInviteOpen(false);
					form.reset();
				}
			});
		},
	});

	// Action Handlers
	const updateRole = (memberId: string, newRole: "admin" | "member") => {
		startTransition(async () => {
			const { error } = await authClient.organization.updateMemberRole({
				memberId, // Better Auth needs the member record ID
				role: newRole,
			});
			if (error) toast.error(error.message);
			else toast.success("Role updated");
		});
	};

	const removeMember = (memberId: string) => {
		startTransition(async () => {
			const { error } = await authClient.organization.removeMember({
				memberIdOrEmail: memberId,
			});
			if (error) toast.error(error.message);
			else toast.success("Member removed from organization");
		});
	};

	const cancelInvite = (invitationId: string) => {
		startTransition(async () => {
			const { error } = await authClient.organization.cancelInvitation({
				invitationId,
			});
			if (error) toast.error(error.message);
			else toast.success("Invitation cancelled");
		});
	};

	return (
		<>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-lg font-semibold md:text-2xl">Members</h1>
					<p className="hidden text-xs text-muted-foreground md:block">
						Manage your organization's team and access levels.
					</p>
				</div>

				{isAdminOrOwner && (
					<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<UserPlus className="size-4" />
								<span className="hidden sm:inline">Invite Member</span>
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-96">
							<DialogHeader>
								<DialogTitle>Invite team member</DialogTitle>
								<DialogDescription>
									They will receive an email to join your organization.
								</DialogDescription>
							</DialogHeader>
							<form {...getFormProps(form)} className="space-y-4 pt-4">
								<div className="space-y-2">
									<Input
										{...getInputProps(fields.email, { type: "email" })}
										placeholder="name@company.com"
										className="h-10"
										autoFocus
									/>
									{fields.email.errors && (
										<p className="text-[10px] text-destructive">
											{fields.email.errors}
										</p>
									)}
								</div>
								<div className="space-y-2">
									<Select
										onValueChange={(val) =>
											form.update({ name: fields.role.name, value: val })
										}
										defaultValue={fields.role.value}
									>
										<SelectTrigger className="h-10 capitalize">
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<Button
									type="submit"
									className="w-full h-10"
									disabled={isPending}
								>
									{isPending ? "Sending..." : "Send Invitation"}
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<div className="grid lg:grid-cols-3 gap-4">
				{/* Members List - Takes 2 cols on desktop */}
				<div className="border rounded-xl bg-card shadow-sm overflow-hidden lg:col-span-2">
					<div className="divide-y divide-border/50">
						{members?.map((m) => {
							const isSelf = m.userId === currentUser.id;
							const canEdit = isAdminOrOwner && !isSelf && m.role !== "owner";

							return (
								<div
									key={m.id}
									className="flex items-center justify-between p-4 group hover:bg-muted/30 transition-colors overflow-hidden"
								>
									{/* Left: Avatar + Info */}
									<div className="flex items-center gap-3 flex-1 overflow-hidden">
										<CustomAvatar
											avatar={m.usersTable?.image}
											name={m.usersTable?.name}
										/>
										<div className="truncate">
											<span className="text-sm font-medium flex items-center gap-2">
												{m.usersTable?.name || "Pending User"}
												{isSelf && (
													<Badge
														variant="secondary"
														className="text-[10px] h-4 px-1"
													>
														You
													</Badge>
												)}
											</span>
											<span className="block text-xs text-muted-foreground truncate">
												{m.usersTable?.email}
											</span>
										</div>
									</div>

									{/* Right: Role + Actions */}
									<div className="flex items-center gap-2 ml-4">
										<Badge
											variant="outline"
											className="hidden sm:flex capitalize font-normal text-[10px] bg-muted/50"
										>
											{m.role === "admin" || m.role === "owner" ? (
												<ShieldCheck className="size-3 mr-1" />
											) : null}
											{m.role}
										</Badge>

										{canEdit && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="size-8"
													>
														<MoreVertical className="size-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-48">
													<DropdownMenuItem
														onClick={() =>
															updateRole(
																m.id,
																m.role === "admin" ? "member" : "admin",
															)
														}
													>
														Change to {m.role === "admin" ? "Member" : "Admin"}
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive focus:bg-destructive/10 focus:text-destructive"
														onClick={() => removeMember(m.id)}
													>
														<Trash2 className="size-4 mr-2" />
														Remove Member
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Invites Sidebar - Takes 1 col */}

				<div className="space-y-2">
					{invites?.map((i) => (
						<div
							key={i.id}
							className="group relative flex flex-col p-4 rounded-xl border bg-muted/20 text-sm shadow-sm"
						>
							<div className="flex justify-between items-start mb-2">
								<div className="p-2 rounded-full bg-background border">
									<Mail className="size-4 text-muted-foreground" />
								</div>
								{isAdminOrOwner && (
									<Button
										variant="ghost"
										size="icon"
										className="size-6"
										onClick={() => cancelInvite(i.id)}
									>
										<X className="size-4" />
									</Button>
								)}
							</div>
							<p className="font-medium truncate mb-1">{i.email}</p>
							<div className="flex items-center gap-2">
								<Badge
									variant="outline"
									className="text-[10px] uppercase font-bold tracking-tighter h-5"
								>
									{i.role}
								</Badge>
								<span className="text-[10px] text-muted-foreground">
									Expires soon
								</span>
							</div>
						</div>
					))}
					{invites?.length === 0 && (
						<div className="border border-dashed rounded-xl p-8 text-center">
							<p className="text-xs text-muted-foreground">
								No pending invitations
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
