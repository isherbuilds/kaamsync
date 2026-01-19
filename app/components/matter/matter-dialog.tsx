import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import { GitPullRequest, ListTodo, SquarePen } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { Priority, type PriorityValue } from "~/config/matter";
import { getAndIncrementNextShortId } from "~/lib/cache/short-id";
import { cn } from "~/lib/utils";
import { createMatterSchema } from "~/lib/matter/validations";
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

interface MatterDialogProps {
	type: "task" | "request";
	teamId: string;
	teamCode: string;
	statuses: readonly Row["statusesTable"][];
	teamMembers: readonly MemberSelectorItem[];
	triggerButton?: React.ReactNode;
}

export const MatterDialog = memo(
	({
		type,
		teamId,
		teamCode,
		statuses,
		teamMembers,
		triggerButton,
	}: MatterDialogProps) => {
		const z = useZero();
		const [open, setOpen] = useState(false);
		const [isSubmitting, setIsSubmitting] = useState(false);

		const isRequest = type === "request";
		const Icon = isRequest ? GitPullRequest : ListTodo;
		const label = isRequest ? "New Request" : "New Task";
		const accentColor = isRequest ? "text-brand-requests" : "text-brand-tasks";
		const submitLabel = isRequest ? "Submit Request" : "Create Task";
		const submittingLabel = isRequest ? "Submitting..." : "Creating...";

		// Memoize filtered members to prevent recalculation on every render
		const filteredMembers = useMemo(
			() =>
				isRequest
					? teamMembers.filter((m) => m.role === teamRole.manager)
					: teamMembers,
			[isRequest, teamMembers],
		);

		// Pre-fetches a block of Short IDs from the server when dialog opens
		useShortIdSeeder(teamId, open);

		const [form, fields] = useForm({
			id: `create-matter-${type}`,
			constraint: getZodConstraint(createMatterSchema),
			defaultValue: {
				priority: (isRequest ? Priority.MEDIUM : Priority.NONE).toString(),
				statusId: statuses.find((s) => s.isDefault)?.id || statuses[0]?.id,
			},
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: createMatterSchema }),
			onSubmit: (e, { submission }) => {
				e.preventDefault();
				if (submission?.status !== "success") return;

				const { title, description, statusId, assigneeId, priority, dueDate } =
					submission.value;

				const clientShortID = getAndIncrementNextShortId(teamId);

				setIsSubmitting(true);
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

						// Send push notification to assignee (fire and forget)
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
					.finally(() => setIsSubmitting(false));
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
					<DialogTitle className="sr-only">{label}</DialogTitle>
					<DialogDescription className="sr-only">
						{isRequest ? "Create a new approval request" : "Create a new task"}
					</DialogDescription>

					<form {...getFormProps(form)} className="flex flex-col bg-background">
						<div className="space-y-4 p-6">
							<div
								className={`flex items-center gap-2 font-bold text-xs uppercase tracking-tight ${accentColor}`}
							>
								<Icon className="size-3.5" /> {teamCode} / {label}
							</div>

							<input
								{...getInputProps(fields.title, { type: "text" })}
								key={fields.title.key}
								autoFocus
								autoComplete="off"
								placeholder={isRequest ? "What needs approval?" : "Task title"}
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
								placeholder={
									isRequest
										? "Provide context for the managers..."
										: "Description..."
								}
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
									disabled={isSubmitting}
								>
									{isSubmitting ? submittingLabel : submitLabel}
								</Button>
							</div>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
