import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery } from "@rocicorp/zero/react";
import {
	Mail,
	MoreVertical,
	ShieldCheck,
	Trash2,
	UserPlus,
	X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z } from "zod";

// UI Components
import { CustomAvatar } from "~/components/ui/avatar";
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
import { orgRole } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
// Auth & Hooks
import { authClient } from "~/lib/auth/client";
import { getPlanLimits } from "~/lib/pricing";

const inviteSchema = z.object({
	email: z.email("Please enter a valid email"),
	role: z.enum(orgRole),
});

export default function OrgMembersPage() {
	const { authSession } = useOrgLoaderData();
	const [isPending, startTransition] = useTransition();
	const [inviteOpen, setInviteOpen] = useState(false);

	// Data
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [invites] = useQuery(queries.getOrganizationInvitations(), CACHE_LONG);
	const [orgs] = useQuery(queries.getOrganizationList(), CACHE_LONG);

	const currentUser = authSession.user;
	const currentMember = members?.find((m) => m.userId === currentUser.id);
	const isAdminOrOwner =
		currentMember?.role === "admin" || currentMember?.role === "owner";

	// Get current org plan
	const currentOrgId = authSession.session.activeOrganizationId;
	const currentOrg = orgs?.find((o) => o.id === currentOrgId);

	// Fallback to free plan if org not found
	const orgPlan = currentOrg?.plan ?? "starter";

	// Plan limits checking
	const planLimits = getPlanLimits(orgPlan);

	const memberCount = members?.length ?? 0;
	const pendingInvites =
		invites?.filter((i) => i.expiresAt > Date.now())?.length ?? 0;
	const effectiveMemberCount = memberCount + pendingInvites;
	const canAddMember =
		planLimits.maxMembers === null ||
		effectiveMemberCount < planLimits.maxMembers;
	const remainingSlots =
		planLimits.maxMembers === null
			? null
			: Math.max(0, planLimits.maxMembers - effectiveMemberCount);

	// Form logic
	const [form, fields] = useForm({
		id: "org-invite-member",
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
				}
			});
		},
	});

	// Action Handlers
	const updateRole = (
		memberId: string,
		newRole: "admin" | "member" | "guest",
	) => {
		startTransition(async () => {
			const { error } = await authClient.organization.updateMemberRole({
				memberId,
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
					<h1 className="font-semibold text-lg md:text-2xl">Members</h1>
					<p className="hidden text-muted-foreground text-xs md:block">
						Manage your organization's team and access levels.
					</p>
				</div>

				{isAdminOrOwner && (
					<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
						<DialogTrigger asChild>
							<Button
								size="sm"
								disabled={!canAddMember}
								title={
									!canAddMember
										? `Member limit reached (${planLimits.maxMembers}). Upgrade to add more.`
										: undefined
								}
							>
								<UserPlus className="size-4" />
								<span className="hidden sm:inline">Invite Member</span>
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-96">
							<DialogHeader>
								<DialogTitle>Invite team member</DialogTitle>
								<DialogDescription>
									They will receive an email to join your organization.
									{remainingSlots !== null && (
										<div className="mt-2 text-muted-foreground text-xs">
											{remainingSlots > 0
												? `${remainingSlots} of ${planLimits.maxMembers} slots remaining`
												: `Member limit reached. Upgrade to add more.`}
										</div>
									)}
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
											<SelectItem value="guest">
												Guest (Read specific tasks)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<Button
									type="submit"
									className="h-10 w-full"
									disabled={isPending}
								>
									{isPending ? "Sending..." : "Send Invitation"}
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				{/* Members List - Takes 2 cols on desktop */}
				<div className="overflow-hidden rounded-xl border bg-card shadow-sm lg:col-span-2">
					<div className="divide-y divide-border/50">
						{members?.map((m) => {
							const isSelf = m.userId === currentUser.id;
							const canEdit = isAdminOrOwner && !isSelf && m.role !== "owner";

							return (
								<div
									key={m.id}
									className="group flex items-center justify-between overflow-hidden p-4 transition-colors hover:bg-muted/30"
								>
									{/* Left: Avatar + Info */}
									<div className="flex flex-1 items-center gap-3 overflow-hidden">
										<CustomAvatar
											avatar={m.usersTable?.image}
											name={m.usersTable?.name}
										/>
										<div className="truncate">
											<span className="flex items-center gap-2 font-medium text-sm">
												{m.usersTable?.name || "Pending User"}
												{isSelf && (
													<Badge
														variant="secondary"
														className="h-4 px-1 text-[10px]"
													>
														You
													</Badge>
												)}
											</span>
											<span className="block truncate text-muted-foreground text-xs">
												{m.usersTable?.email}
											</span>
										</div>
									</div>

									{/* Right: Role + Actions */}
									<div className="ml-4 flex items-center gap-2">
										<Badge
											variant="outline"
											className="hidden bg-muted/50 font-normal text-[10px] capitalize sm:flex"
										>
											{m.role === "admin" || m.role === "owner" ? (
												<ShieldCheck className="mr-1 size-3" />
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
														onClick={() => updateRole(m.id, "admin")}
														disabled={m.role === "admin"}
													>
														Make Admin
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => updateRole(m.id, "member")}
														disabled={m.role === "member"}
													>
														Make Member
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => updateRole(m.id, "guest")}
														disabled={m.role === "guest"}
													>
														Make Guest
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive focus:bg-destructive/10 focus:text-destructive"
														onClick={() => removeMember(m.id)}
													>
														<Trash2 className="mr-2 size-4" />
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
							className="group relative flex flex-col rounded-xl border bg-muted/20 p-4 text-sm shadow-sm"
						>
							<div className="mb-2 flex items-start justify-between">
								<div className="rounded-full border bg-background p-2">
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
							<p className="mb-1 truncate font-medium">{i.email}</p>
							<div className="flex items-center gap-2">
								<Badge
									variant="outline"
									className="h-5 font-bold text-[10px] uppercase tracking-tighter"
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
						<div className="rounded-xl border border-dashed p-8 text-center">
							<p className="text-muted-foreground text-xs">
								No pending invitations
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
