import { getCollectionProps, getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { MoreVerticalIcon, TrashIcon, UserPlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z as zod } from "zod";
import { CustomChildrenField } from "~/components/forms";
import { MemberSelect } from "~/components/matter-field-selectors";
// UI Components
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
import { type WorkspaceRole, workspaceRole } from "~/db/helpers";
import { useOrgLoaderData } from "~/hooks/use-loader-data";

// 1. Define a Schema for Conform
const addMemberSchema = zod.object({
	userId: zod.string({ error: "Please select a user" }),
	role: zod.enum(workspaceRole),
});

export default function WorkspaceMembersPage() {
	const { authSession } = useOrgLoaderData();
	const z = useZero();

	const { workspaceCode } = useParams();
	const [addMemberOpen, setAddMemberOpen] = useState(false);

	// 2. Optimized Query
	const [workspace] = useQuery(
		queries.getWorkspaceByCode({ code: workspaceCode ?? "" }),
		CACHE_LONG,
	);

	// 3. Get Organization Members
	const [orgMembers] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);

	// 4. Derived State
	const workspaceMembers = workspace?.memberships ?? [];
	const currentMembership = workspaceMembers.find(
		(m) => m.userId === authSession.user.id,
	);
	const isManager = currentMembership?.role === "manager";

	const availableOrgMembers = useMemo(() => {
		const existingIds = new Set(workspaceMembers.map((m) => m.userId));
		return orgMembers?.filter((m) => !existingIds.has(m.userId)) ?? [];
	}, [orgMembers, workspaceMembers]);

	// 5. Conform Form Setup
	const [form, fields] = useForm({
		id: "add-member",
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: addMemberSchema });
		},
		defaultValue: {
			role: workspaceRole.viewer,
		},
		onSubmit: async (event, { submission }) => {
			event.preventDefault();

			console.log("Submission:", submission);

			if (submission?.status !== "success" || !workspace) return;

			const { userId, role } = submission.value;

			try {
				await z.mutate(
					mutators.workspace.addMember({
						workspaceId: workspace.id,
						userId,
						role,
					}),
				);
				toast.success("Member added");
				setAddMemberOpen(false);
			} catch (_e) {
				toast.error("Failed to add member");
			}
		},
	});

	// Actions
	const handleUpdateRole = async (userId: string, role: WorkspaceRole) => {
		if (!workspace) return;
		try {
			await z.mutate(
				mutators.workspace.updateMemberRole({
					workspaceId: workspace.id,
					userId,
					role,
				}),
			);
			toast.success(`Role updated to ${role}`);
		} catch (_e) {
			toast.error("Failed to update role");
		}
	};

	const handleRemoveMember = async (userId: string) => {
		if (!workspace) return;

		const memberToRestore = workspaceMembers.find((m) => m.userId === userId);
		if (!memberToRestore) return;

		// Optimistic mutation call
		try {
			await z.mutate(
				mutators.workspace.removeMember({
					workspaceId: workspace.id,
					userId,
				}),
			);

			toast("Member removed", {
				action: {
					label: "Undo",
					onClick: () => {
						z.mutate(
							mutators.workspace.addMember({
								workspaceId: workspace.id,
								userId: memberToRestore.userId,
								role: memberToRestore.role as WorkspaceRole,
							}),
						);
					},
				},
			});
		} catch (_e) {
			toast.error("Failed to remove member");
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 w-full">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Workspace Members
					</h1>
					<p className="text-muted-foreground text-sm">
						Manage access for the{" "}
						<span className="font-medium text-foreground">
							{workspace?.name}
						</span>{" "}
						workspace.
					</p>
				</div>

				{isManager && (
					<Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
						<DialogTrigger asChild>
							<Button size="sm" className="gap-2">
								<UserPlusIcon className="size-4" />
								Add Member
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add Workspace Member</DialogTitle>
								<DialogDescription>
									Invite someone from your organization to this workspace.
								</DialogDescription>
							</DialogHeader>

							<form {...getFormProps(form)} className="space-y-6">
								<CustomChildrenField labelProps={{ children: "Select Member" }}>
									<MemberSelect
										members={availableOrgMembers}
										value={fields.userId.value ?? ""}
										onChange={(value) =>
											form.update({ name: fields.userId.name, value })
										}
										showLabel
										align="start"
										className="w-full rounded-md border bg-muted px-2"
									/>
									<input
										type="hidden"
										name={fields.userId.name}
										value={fields.userId.value ?? ""}
									/>
								</CustomChildrenField>

								<div
									role="radiogroup"
									aria-label="Role"
									className="flex gap-2 justify-between"
								>
									{getCollectionProps(fields.role, {
										type: "radio",
										options: Object.values(workspaceRole),
									}).map((props) => (
										<label key={props.value} className="flex-1 cursor-pointer">
											<input {...props} className="sr-only peer" />
											<span className="block capitalize text-sm rounded py-1 text-center transition-all duration-150 bg-muted hover:bg-primary hover:text-white peer-checked:bg-primary peer-checked:text-white shadow-sm">
												{props.value}
											</span>
										</label>
									))}
								</div>

								<Button type="submit" className="w-full">
									Add to Workspace
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</header>

			<div className="rounded-lg border bg-card overflow-hidden">
				<div className="divide-y">
					{workspaceMembers.length === 0 && (
						<div className="p-8 text-center text-muted-foreground text-sm">
							No members found.
						</div>
					)}
					{workspaceMembers.map((member) => (
						<MemberRow
							key={member.id}
							member={member}
							isManager={isManager}
							onUpdateRole={(role) => handleUpdateRole(member.userId, role)}
							onRemove={() => handleRemoveMember(member.userId)}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

// --- Sub-components ---

interface MemberRowProps {
	member: any; // Ideally import this type from your Zero schema
	isManager: boolean;
	onUpdateRole: (role: WorkspaceRole) => void;
	onRemove: () => void;
}

function MemberRow({
	member,
	isManager,
	onUpdateRole,
	onRemove,
}: MemberRowProps) {
	return (
		<div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/40 group">
			<div className="flex items-center gap-3">
				<Avatar className="h-9 w-9 border border-border/50">
					<AvatarImage src={member.user?.image ?? undefined} />
					<AvatarFallback className="text-xs">
						{member.user?.name?.[0] ?? member.user?.email?.[0]}
					</AvatarFallback>
				</Avatar>
				<div className="flex flex-col">
					<span className="text-sm font-medium leading-none">
						{member.user?.name || "Unknown"}
					</span>
					<span className="text-xs text-muted-foreground mt-1">
						{member.user?.email}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<Badge
					variant="secondary"
					className="capitalize font-normal px-2 py-0 h-5 text-[10px] bg-muted/50 text-muted-foreground border-transparent"
				>
					{member.role}
				</Badge>

				{isManager && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="icon" variant="ghost" aria-label="Member actions">
								<MoreVerticalIcon className="size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							{Object.values(workspaceRole).map((role) => (
								<DropdownMenuItem key={role} onClick={() => onUpdateRole(role)}>
									Make {role.charAt(0).toUpperCase() + role.slice(1)}
								</DropdownMenuItem>
							))}
							<DropdownMenuItem
								className="text-destructive focus:bg-destructive/10 focus:text-destructive"
								onClick={onRemove}
							>
								<TrashIcon className="size-4 text-destructive" />
								Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}
