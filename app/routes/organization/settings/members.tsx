import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery } from "@rocicorp/zero/react";
import { MoreVerticalIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { orgRole } from "~/db/helpers.js";
import { authClient } from "~/lib/auth-client";

const inviteSchema = z.object({
	email: z.email("Invalid email"),
	role: z.enum(orgRole).default(orgRole.member),
});

export default function MembersPage() {
	const [inviteOpen, setInviteOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [invitations] = useQuery(
		queries.getOrganizationInvitations(),
		CACHE_LONG,
	);

	const [form, fields] = useForm({
		id: "invite-member",
		defaultValue: { role: "member" },
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: inviteSchema }),
		onSubmit: async (event, { submission }) => {
			event.preventDefault();
			if (submission?.status !== "success") return;

			const { error } = await authClient.organization.inviteMember(
				submission.value,
			);
			if (error) return toast.error(error.message);
			setInviteOpen(false);
			toast.success("Invitation sent");
			form.reset();
		},
	});

	const runAction = (
		name: string,
		fn: () => Promise<{ error?: { message?: string } | null }>,
	) => {
		startTransition(async () => {
			const { error } = await fn();
			error
				? toast.error(error?.message || `Failed to ${name}`)
				: toast.success(`${name} successful`);
		});
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Organization Members</h1>
					<p className="text-sm text-muted-foreground">
						Manage organization members and invites.
					</p>
				</div>
				<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
					<DialogTrigger asChild>
						<Button size="sm">
							<UserPlusIcon className="size-4" />
							Invite
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Invite Member</DialogTitle>
							<DialogDescription>
								Invite a new member to your organization by entering their email
								address below.
							</DialogDescription>
						</DialogHeader>
						<form {...getFormProps(form)} className="space-y-4">
							<Input
								{...getInputProps(fields.email, { type: "email" })}
								placeholder="email@example.com"
							/>
							<div className="flex gap-2">
								{Object.values(orgRole).map((r) => (
									<Button
										key={r}
										type="button"
										size="sm"
										variant={fields.role.value === r ? "default" : "outline"}
										onClick={() =>
											form.update({ name: fields.role.name, value: r })
										}
										className="flex-1 capitalize"
									>
										{r}
									</Button>
								))}
							</div>
							<Button type="submit" className="w-full" disabled={isPending}>
								Send Invite
							</Button>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			<div className="grid gap-6 md:grid-cols-3 items-start overflow-y-auto">
				<div className="md:col-span-2 border rounded-lg divide-y bg-card">
					{members?.map((m) => (
						<div key={m.id} className="flex items-center justify-between p-4">
							<div className="flex items-center gap-3">
								<Avatar className="h-8 w-8">
									<AvatarImage src={m.usersTable?.image || ""} />
									<AvatarFallback>{m.usersTable?.email[0]}</AvatarFallback>
								</Avatar>
								<div className="text-sm">
									<div className="font-medium">
										{m.usersTable?.name || "Pending"}
									</div>
									<div className="text-muted-foreground text-xs">
										{m.usersTable?.email}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="secondary" className="text-[10px] uppercase">
									{m.role}
								</Badge>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="icon" variant="ghost" className="h-8 w-8">
											<MoreVerticalIcon className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() =>
												runAction("Update", () =>
													authClient.organization.updateMemberRole({
														memberId: m.userId,
														role:
															m.role === orgRole.admin
																? orgRole.member
																: orgRole.admin,
													}),
												)
											}
										>
											Make {m.role === orgRole.admin ? "Member" : "Admin"}
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive"
											onClick={() =>
												runAction("Remove", () =>
													authClient.organization.removeMember({
														memberIdOrEmail: m.userId,
													}),
												)
											}
										>
											Remove
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					))}
				</div>

				<div className="border rounded-lg bg-muted/30 p-4 space-y-3">
					<h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
						Pending
					</h3>
					{invitations?.map((i) => (
						<div
							key={i.id}
							className="flex items-center justify-between bg-card border rounded p-2 text-xs"
						>
							<div className="truncate pr-2">
								<div className="font-medium truncate">{i.email}</div>
								<div className="text-muted-foreground capitalize">{i.role}</div>
							</div>
							<Button
								size="icon"
								variant="ghost"
								className="h-6 w-6 shrink-0"
								onClick={() =>
									runAction("Cancel", () =>
										authClient.organization.cancelInvitation({
											invitationId: i.id,
										}),
									)
								}
							>
								<XIcon className="h-3 w-3" />
							</Button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
