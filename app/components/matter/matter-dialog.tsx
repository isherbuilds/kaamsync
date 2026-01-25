import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import { GitPullRequest, ListTodo, SquarePen } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { useTeamShortIdCache } from "~/hooks/use-short-id";
import { Priority, type PriorityValue } from "~/config/matter";
import { consumeNextShortId } from "~/lib/cache/short-id";
import { cn } from "~/lib/utils";
import { matterCreateFormSchema } from "~/lib/matter/validations";
import { matterType, teamRole } from "../../db/helpers";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "../ui/dialog";
import {
	MemberSelect,
	type MemberSelectorItem,
	PrioritySelect,
	StatusSelect,
} from "./matter-field-selectors";

const DIALOG_CONFIG = {
	task: {
		dialogTitle: "New Task",
		dialogAccentClass: "text-brand-tasks",
		submitLabel: "Create Task",
		submittingLabel: "Creating...",
		Icon: ListTodo,
		titlePlaceholder: "Task title",
		descriptionPlaceholder: "Description...",
		dialogDescription: "Create a new task",
	},
	request: {
		dialogTitle: "New Request",
		dialogAccentClass: "text-brand-requests",
		submitLabel: "Submit Request",
		submittingLabel: "Submitting...",
		Icon: GitPullRequest,
		titlePlaceholder: "What needs approval?",
		descriptionPlaceholder: "Provide context for the managers...",
		dialogDescription: "Create a new approval request",
	},
} as const;

interface CreateMatterDialogProps {
	type: "task" | "request";
	teamId: string;
	teamCode: string;
	statuses: readonly Row["statusesTable"][];
	teamMembers: readonly MemberSelectorItem[];
	triggerButton?: React.ReactNode;
}

export const CreateMatterDialog = memo(
	({
		type,
		teamId,
		teamCode,
		statuses,
		teamMembers,
		triggerButton,
	}: CreateMatterDialogProps) => {
		const z = useZero();
		const [open, setOpen] = useState(false);
		const [isCreating, setIsCreating] = useState(false);

		const isRequest = type === "request";
		const {
			dialogTitle,
			dialogAccentClass,
			submitLabel,
			submittingLabel,
			Icon,
			titlePlaceholder,
			descriptionPlaceholder,
			dialogDescription,
		} = DIALOG_CONFIG[type];

		const filteredMembers = useMemo(
			() =>
				isRequest
					? teamMembers.filter((m) => m.role === teamRole.manager)
					: teamMembers,
			[isRequest, teamMembers],
		);

		useTeamShortIdCache(teamId, open);

		const [form, fields] = useForm({
			id: `create-matter-${type}`,
			constraint: getZodConstraint(matterCreateFormSchema),
			defaultValue: {
				priority: (isRequest ? Priority.MEDIUM : Priority.NONE).toString(),
				statusId: statuses.find((s) => s.isDefault)?.id || statuses[0]?.id,
			},
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: matterCreateFormSchema }),
			onSubmit: (e, { submission }) => {
				e.preventDefault();
				if (submission?.status !== "success") return;

				const { title, description, statusId, assigneeId, priority, dueDate } =
					submission.value;

				const clientShortID = consumeNextShortId(teamId);

				setIsCreating(true);
				z.mutate(
					mutators.matter.create({
						teamId,
						teamCode,
						title,
						description,
						type: isRequest ? matterType.request : matterType.task,
						statusId:
							statusId ||
							statuses.find((s) => s.isDefault)?.id ||
							statuses[0]?.id ||
							"",
						assigneeId: assigneeId ?? undefined,
						priority: Number(priority),
						dueDate: dueDate
							? new Date(dueDate).getTime()
							: isRequest
								? Date.now() + 7 * 24 * 60 * 60 * 1000
								: undefined,
						clientShortID,
					}),
				)
					.server.then(() => {
						toast.success(
							isRequest
								? "Request submitted for approval"
								: `${teamCode}-${clientShortID} created`,
						);
						setOpen(false);
						form.reset();

						if (assigneeId) {
							import("~/hooks/use-push-notifications").then(
								({ sendNotificationToUser }) => {
									sendNotificationToUser(
										assigneeId,
										isRequest ? "New Request Assigned" : "New Task Assigned",
										`${teamCode}-${clientShortID}: ${title}`,
										`/${teamCode}/matter/${teamCode}-${clientShortID}`,
									);
								},
							);
						}
					})
					.catch((e) => {
						console.error(`Failed to create ${type}:`, e);
						toast.error(
							e instanceof Error
								? e.message
								: `Failed to create ${type}. Please try again.`,
						);
					})
					.finally(() => setIsCreating(false));
			},
		});

		return (
			<Dialog onOpenChange={setOpen} open={open}>
				<DialogTrigger asChild>
					{triggerButton || (
						<Button
							size="sm"
							variant={isRequest ? "outline" : "default"}
							className={isRequest ? "gap-2" : ""}
						>
							{isRequest ? (
								<GitPullRequest className="size-4" />
							) : (
								<SquarePen className="size-4" />
							)}
							{isRequest ? "New Request" : "Task"}
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="max-w-3xl overflow-hidden p-0 focus:outline-none">
					<DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
					<DialogDescription className="sr-only">
						{dialogDescription}
					</DialogDescription>

					<form {...getFormProps(form)} className="flex flex-col bg-background">
						<div className="space-y-4 p-6">
							<div
								className={`flex items-center gap-2 font-bold text-xs uppercase tracking-tight ${dialogAccentClass}`}
							>
								<Icon className="size-3.5" /> {teamCode} / {dialogTitle}
							</div>

							<input
								{...getInputProps(fields.title, { type: "text" })}
								key={fields.title.key}
								autoFocus
								autoComplete="off"
								placeholder={titlePlaceholder}
								className="w-full bg-transparent font-semibold text-xl outline-none placeholder:text-muted-foreground/30"
							/>
							{fields.title.errors && (
								<p className="font-medium text-destructive text-xs">
									{fields.title.errors}
								</p>
							)}

							<textarea
								{...getInputProps(fields.description, { type: "text" })}
								key={fields.description.key}
								placeholder={descriptionPlaceholder}
								className="min-h-32 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
							/>
							{fields.description.errors && (
								<p className="font-medium text-destructive text-xs">
									{fields.description.errors}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-3 border-t bg-muted/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-wrap items-center gap-1">
								{!isRequest && (
									<StatusSelect
										name={fields.statusId.name}
										value={fields.statusId.value}
										statuses={statuses}
										onChange={(v) =>
											form.update({ name: fields.statusId.name, value: v })
										}
										showLabel
										className="h-7 border bg-background px-2"
									/>
								)}

								<PrioritySelect
									name={fields.priority.name}
									value={Number(fields.priority.value) as PriorityValue}
									onChange={(v) =>
										form.update({
											name: fields.priority.name,
											value: v.toString(),
										})
									}
									showLabel
									className="h-7 border bg-background px-2"
								/>

								<MemberSelect
									name={fields.assigneeId.name}
									value={fields.assigneeId.value ?? undefined}
									members={filteredMembers}
									onChange={(v) =>
										form.update({
											name: fields.assigneeId.name,
											value: v ?? undefined,
										})
									}
									showLabel
									className="h-7 border bg-background px-2"
								/>

								<div className="relative">
									<input
										{...getInputProps(fields.dueDate, { type: "date" })}
										key={fields.dueDate.key}
										className="h-7 rounded border bg-background px-2 text-muted-foreground text-xs outline-none hover:bg-muted focus:ring-1 focus:ring-ring"
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-3">
								<Button
									type="submit"
									size="sm"
									className={cn(
										"h-8 px-4 font-medium",
										isRequest && "bg-brand-requests hover:bg-brand-requests/90",
									)}
									disabled={isCreating}
								>
									{isCreating ? submittingLabel : submitLabel}
								</Button>
							</div>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
