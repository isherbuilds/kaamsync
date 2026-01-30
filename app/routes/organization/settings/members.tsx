import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery } from "@rocicorp/zero/react";
import Mail from "lucide-react/dist/esm/icons/mail";
import MoreVertical from "lucide-react/dist/esm/icons/more-vertical";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import X from "lucide-react/dist/esm/icons/x";
import { useState, useTransition } from "react";
import { data, Link, useRouteError, useRouteLoaderData } from "react-router";
import { toast } from "sonner";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z } from "zod";
import { InputField, SelectField } from "~/components/shared/forms";
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
import { orgRole } from "~/db/helpers";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { authClient } from "~/lib/auth/client";
import { getServerSession } from "~/lib/auth/server";
import { checkMemberLimit } from "~/lib/billing/service";

import type { Route } from "./+types/members.ts";
import type { loader as settingsLoader } from "./layout";

const inviteSchema = z.object({
	email: z.email("Please enter a valid email"),
	role: z.enum(orgRole),
});

export async function action({ request }: Route.ActionArgs) {
	const session = await getServerSession(request);
	if (!session?.session?.activeOrganizationId) {
		return data({ error: "No active organization" }, { status: 401 });
	}
	const result = await checkMemberLimit(session.session.activeOrganizationId);
	if (!result.allowed) {
		return data(
			{ error: result.reason ?? "Member limit reached" },
			{ status: 403 },
		);
	}
	return data({ success: true });
}

export default function OrgMembersPage() {
	const { authSession } = useOrganizationLoaderData();
	const settingsData = useRouteLoaderData<typeof settingsLoader>(
		"routes/organization/settings/layout",
	);
	const memberLimit = settingsData?.limits?.members ?? { allowed: true };
	const [isPending, startTransition] = useTransition();
	const [inviteOpen, setInviteOpen] = useState(false);

	const [members] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);
	const [invites] = useQuery(queries.getOrganizationInvitations(), CACHE_LONG);

	const currentUser = authSession.user;
	const currentMember = members?.find((m) => m.userId === currentUser.id);
	const isAdminOrOwner =
		currentMember?.role === "admin" || currentMember?.role === "owner";

	const [form, fields] = useForm({
		id: "org-invite-member",
		defaultValue: { role: "member" },
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: inviteSchema }),
		onSubmit: async (event, { submission }) => {
			event.preventDefault();
			if (submission?.status !== "success") return;

			if (!memberLimit.allowed) {
				toast.error(
					memberLimit.reason ??
						"Member limit reached. Please upgrade your plan.",
				);
				return;
			}

			startTransition(async () => {
				toast.promise(
					(async () => {
						const { data: invite, error } =
							await authClient.organization.inviteMember({
								email: submission.value.email,
								role: submission.value.role,
							});
						if (error) throw error;
						return invite;
					})(),
					{
						loading: "Sending invitation...",
						success: () => {
							setInviteOpen(false);
							return `Invitation sent to ${submission.value.email}`;
						},
						error: (err: unknown) =>
							err instanceof Error ? err.message : "Failed to send invitation",
					},
				);
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
					<h1 className="font-semibold text-lg md:text-2xl">Members</h1>
					<p className="hidden text-muted-foreground text-xs md:block">
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
									<InputField
										labelProps={{ children: "Email Address" }}
										inputProps={{
											...getInputProps(fields.email, { type: "email" }),
											placeholder: "name@company.com",
											autoFocus: true,
										}}
										errors={fields.email.errors}
									/>
								</div>
								<div className="space-y-2">
									<SelectField
										labelProps={{ children: "Role" }}
										id={fields.role.id}
										name={fields.role.name}
										placeholder="Select a role"
										defaultValue={fields.role.defaultValue}
										items={[
											{ name: "Admin", value: "admin" },
											{ name: "Member", value: "member" },
										]}
									/>
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

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<h2 className="font-semibold text-lg">Members Error</h2>
			<p className="text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "Failed to load members"}
			</p>
			<Link to="." className="text-primary hover:underline" prefetch="intent">
				Try again
			</Link>
		</div>
	);
}
