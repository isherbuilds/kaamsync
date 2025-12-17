import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useQuery } from "@rocicorp/zero/react";
import {
	MailIcon,
	MoreVerticalIcon,
	TrashIcon,
	UserPlusIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Form, useRouteLoaderData } from "react-router";
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
import { Label } from "~/components/ui/label";
import { useOrgLoaderData } from "~/hooks/use-loader-data";
import { authClient } from "~/lib/auth-client";
import type { Route } from "./+types/members";

const inviteSchema = z.object({
	email: z.email("Please enter a valid email address"),
	role: z.string().optional(),
});

export default function MembersPage() {
	// Get query context from parent layout
	const { authSession } = useOrgLoaderData();
	const [inviteOpen, setInviteOpen] = useState(false);

	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);

	const [invitations] = useQuery(
		queries.getOrganizationInvitations(),
		CACHE_LONG,
	);

	const [form, fields] = useForm({
		constraint: getZodConstraint(inviteSchema),
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: inviteSchema });
		},
		async onSubmit(event, context) {
			event.preventDefault();
			if (context.submission?.status !== "success") return;

			const { email, role } = context.submission.value;

			try {
				await authClient.organization.inviteMember({
					email,
					role: (role as "member" | "admin" | "owner") || "member",
				});
				toast.success("Invitation sent successfully!");
				setInviteOpen(false);
				form.reset();
			} catch {
				toast.error("Failed to send invitation");
			}
		},
	});

	const handleRemoveMember = async (userId: string) => {
		if (!confirm("Are you sure you want to remove this member?")) {
			return;
		}

		try {
			await authClient.organization.removeMember({
				memberIdOrEmail: userId,
			});
			toast.success("Member removed successfully");
		} catch {
			toast.error("Failed to remove member");
		}
	};

	const handleUpdateRole = async (userId: string, role: string) => {
		try {
			await authClient.organization.updateMemberRole({
				memberId: userId,
				role: role as "member" | "admin" | "owner",
			});
			toast.success("Member role updated successfully");
		} catch {
			toast.error("Failed to update member role");
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-4">
			<div className="grid gap-4 md:grid-cols-3">
				<div className="md:col-span-2">
					<div className="flex flex-col gap-4 card-container">
						<div className="flex flex-col space-y-1.5 p-6">
							<div className="flex flex-row items-center justify-between">
								<div>
									<h3 className="font-semibold leading-none tracking-tight">
										Team Members
									</h3>
									<p className="text-muted-foreground text-sm">
										Manage your organization members and their roles
									</p>
								</div>
								<Dialog onOpenChange={setInviteOpen} open={inviteOpen}>
									<DialogTrigger asChild>
										<Button size="sm">
											<UserPlusIcon className="h-4 w-4" />
											Invite Member
										</Button>
									</DialogTrigger>
									<DialogContent>
										<DialogHeader>
											<DialogTitle>Invite Team Member</DialogTitle>
											<DialogDescription>
												Send an invitation to join your organization. You can
												invite anyone by email - they don't need to have an
												account yet.
											</DialogDescription>
										</DialogHeader>
										<Form method="post" {...getFormProps(form)}>
											<div className="space-y-4">
												<div>
													<Label htmlFor={fields.email.id}>Email Address</Label>
													<Input
														{...getInputProps(fields.email, { type: "email" })}
														placeholder="colleague@example.com"
													/>
													{fields.email.errors && (
														<p className="mt-1 text-destructive text-sm">
															{fields.email.errors[0]}
														</p>
													)}
													<p className="mt-1 text-muted-foreground text-xs">
														The invitation will be sent to this email. If they
														don't have an account, they can sign up and the
														invitation will be waiting for them. Note: New
														members won't have workspace access until explicitly
														granted by an admin.
													</p>
												</div>
												<div className="flex justify-end gap-2">
													<Button
														onClick={() => setInviteOpen(false)}
														type="button"
														variant="outline"
													>
														Cancel
													</Button>
													<Button type="submit">Send Invitation</Button>
												</div>
											</div>
										</Form>
									</DialogContent>
								</Dialog>
							</div>
						</div>
						<div className="p-6 pt-0">
							{!members && (
								<div className="py-8 text-center text-muted-foreground text-sm">
									Loading members...
								</div>
							)}
							{members && members.length === 0 && (
								<div className="py-8 text-center text-muted-foreground text-sm">
									No members found
								</div>
							)}
							{members && members.length > 0 && (
								<div className="divide-y">
									{members.map((member) => (
										<div
											className="flex items-center justify-between py-3"
											key={member.id}
										>
											<div className="flex items-center gap-2">
												<Avatar className="h-10 w-10">
													<AvatarImage
														alt={
															member.usersTable?.name ||
															member.usersTable?.email ||
															"User"
														}
														src={
															member.usersTable?.image ??
															`https://api.dicebear.com/9.x/glass/svg?seed=${member.usersTable?.name || member.usersTable?.email}`
														}
													/>
													<AvatarFallback>
														{(
															member.usersTable?.name ||
															member.usersTable?.email
														)
															?.charAt(0)
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className="font-medium">
														{member.usersTable?.name || "Unknown"}
													</div>
													<div className="text-muted-foreground text-sm">
														{member.usersTable?.email}
													</div>
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">{member.role}</Badge>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button size="icon" variant="ghost">
															<MoreVerticalIcon className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem
															onClick={() =>
																handleUpdateRole(
																	member.userId,
																	member.role === "admin" ? "member" : "admin",
																)
															}
														>
															{member.role === "admin"
																? "Make Member"
																: "Make Admin"}
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
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<div>
					<div className="flex flex-col gap-4 card-container">
						<div className="flex flex-col space-y-1.5 p-6">
							<h3 className="font-semibold leading-none tracking-tight">
								Pending Invitations
							</h3>
							<p className="text-muted-foreground text-sm">
								Invitations waiting to be accepted. Recipients will see these
								when they sign in or sign up.
							</p>
						</div>
						<div className="p-6 pt-0">
							{!invitations && (
								<div className="py-4 text-center text-muted-foreground text-sm">
									Loading...
								</div>
							)}
							{invitations && invitations.length === 0 && (
								<div className="py-4 text-center text-muted-foreground text-sm">
									No pending invitations
								</div>
							)}
							{invitations && invitations.length > 0 && (
								<div className="space-y-3">
									{invitations.map((invitation) => (
										<div
											className="flex items-start gap-2 rounded-lg border p-3"
											key={invitation.id}
										>
											<MailIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
											<div className="min-w-0 flex-1">
												<div className="truncate font-medium text-sm">
													{invitation.email}
												</div>
												<div className="text-muted-foreground text-xs">
													{invitation.role || "member"}
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
