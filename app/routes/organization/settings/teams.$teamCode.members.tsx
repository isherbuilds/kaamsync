import { getCollectionProps, getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { MoreVertical, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { queries } from "zero/queries";
import { CACHE_LONG } from "zero/query-cache-policy";
import { z } from "zod";
import { CustomChildrenField } from "~/components/shared/forms";
import { MemberSelect } from "~/components/matter/matter-field-selectors";
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
import { type TeamRole, teamRole } from "~/db/helpers";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";

const addMemberSchema = z.object({
	userId: z.string().min(1, "Select a user"),
	role: z.enum(teamRole),
});

export default function TeamMembersPage() {
	const { authSession } = useOrganizationLoaderData();
	const { teamCode } = useParams();
	const zr = useZero();
	const [open, setOpen] = useState(false);

	const [team] = useQuery(
		queries.getTeamByCode({ code: teamCode ?? "" }),
		CACHE_LONG,
	);
	const [orgMembers] = useQuery(queries.getOrganizationMembers(), CACHE_LONG);

	const memberships = useMemo(() => team?.memberships ?? [], [team]);
	const isManager = useMemo(
		() =>
			memberships.find((m) => m.userId === authSession.user.id)?.role ===
			"manager",
		[memberships, authSession],
	);

	const availableUsers = useMemo(() => {
		const existingIds = new Set(memberships.map((m) => m.userId));
		return orgMembers?.filter((m) => !existingIds.has(m.userId)) ?? [];
	}, [orgMembers, memberships]);

	const [form, fields] = useForm({
		id: "teams-add-member",
		onValidate: ({ formData }) =>
			parseWithZod(formData, { schema: addMemberSchema }),
		defaultValue: { role: "member" },
		onSubmit: async (event, { submission }) => {
			event.preventDefault();
			if (submission?.status !== "success" || !team) return;

			zr.mutate(
				mutators.team.addMember({
					teamId: team.id,
					userId: submission.value.userId,
					role: submission.value.role as TeamRole,
				}),
			);

			toast.success("Member added to team");
			setOpen(false);
		},
	});

	const handleRemove = async (member: { userId: string; role: string }) => {
		if (!team) return;
		zr.mutate(
			mutators.team.removeMember({
				teamId: team.id,
				userId: member.userId,
			}),
		);

		toast("Member removed", {
			action: {
				label: "Undo",
				onClick: () =>
					zr.mutate(
						mutators.team.addMember({
							teamId: team.id,
							userId: member.userId,
							role: member.role as TeamRole,
						}),
					),
			},
		});
	};

	return (
		<>
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-lg md:text-2xl">
						{team?.name} Members
					</h1>

					<p className="hidden text-muted-foreground text-xs md:block">
						Manage members who have access to this team.
					</p>
				</div>

				{isManager && (
					<Dialog open={open} onOpenChange={setOpen}>
						<DialogTrigger asChild>
							<Button size="sm">
								<UserPlus className="size-4" /> Add Member
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add Team Member</DialogTitle>
								<DialogDescription>
									Only members of your organization can be added.
								</DialogDescription>
							</DialogHeader>
							<form {...getFormProps(form)} className="space-y-6">
								<CustomChildrenField labelProps={{ children: "Select Member" }}>
									<MemberSelect
										members={availableUsers}
										value={fields.userId.value}
										onChange={(val) =>
											form.update({
												name: fields.userId.name,
												value: val ?? undefined,
											})
										}
										className="w-full rounded-md border bg-muted/50 p-2"
										name={fields.userId.name}
										showLabel
									/>
								</CustomChildrenField>

								<div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-1">
									{getCollectionProps(fields.role, {
										type: "radio",
										options: Object.values(teamRole),
									}).map((props) => (
										<label key={props.value} className="flex-1 cursor-pointer">
											<input {...props} className="peer sr-only" />
											<span className="block rounded-md py-1.5 text-center font-medium text-xs capitalize transition-all peer-checked:bg-background peer-checked:shadow-sm">
												{props.value}
											</span>
										</label>
									))}
								</div>
								<Button type="submit" className="w-full">
									Add to Team
								</Button>
							</form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			<br />

			<section className="w-full flex-1 space-y-4 rounded-xl border">
				<div className="divide-y divide-border/50">
					{memberships.map((m) => (
						<div
							key={m.id}
							className="group flex items-center justify-between p-4 transition-colors hover:bg-muted/20"
						>
							<div className="flex flex-1 items-center gap-3 overflow-hidden">
								<CustomAvatar avatar={m.user?.image} name={m.user?.name} />
								<div className="truncate">
									<p className="truncate font-medium text-sm">{m.user?.name}</p>
									<p className="truncate text-muted-foreground text-xs">
										{m.user?.email}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-4">
								<Badge
									variant="secondary"
									className="h-5 border-transparent bg-muted/50 px-2 font-normal text-[10px] text-muted-foreground uppercase"
								>
									{m.role}
								</Badge>

								{isManager && m.userId !== authSession.user.id && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="icon" className="size-6">
												<MoreVertical className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-44">
											{Object.values(teamRole).map((role: TeamRole) => (
												<DropdownMenuItem
													key={role}
													onClick={() =>
														team &&
														zr.mutate(
															mutators.team.updateMemberRole({
																teamId: team.id,
																userId: m.userId,
																role: role,
															}),
														)
													}
												>
													Make {role}
												</DropdownMenuItem>
											))}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-destructive"
												onClick={() =>
													handleRemove({
														userId: m.userId,
														role: m.role,
													})
												}
											>
												<Trash2 className="mr-2 size-4" /> Remove
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
						</div>
					))}
				</div>
			</section>
		</>
	);
}
