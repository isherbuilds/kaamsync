import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import { ListTodo, Plus } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { getAndIncrementNextShortId } from "~/lib/short-id-cache";
import { matterType } from "../db/helpers";
import { createTaskSchema } from "../lib/validations/matter";
import {
	MemberSelect,
	type MemberSelectorItem,
	PrioritySelect,
	StatusSelect,
} from "./matter-field-selectors";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

interface CreateTaskDialogProps {
	workspaceId: string;
	workspaceCode: string;
	statuses: readonly Row["statusesTable"][];
	workspaceMembers: readonly MemberSelectorItem[];
	triggerButton?: React.ReactNode;
}

export const CreateTaskDialog = memo(
	({
		workspaceId,
		workspaceCode,
		statuses,
		workspaceMembers,
		triggerButton,
	}: CreateTaskDialogProps) => {
		const z = useZero();
		const [open, setOpen] = useState(false);

		// Pre-fetches a block of Short IDs from the server when dialog opens
		useShortIdSeeder(workspaceId, open);

		const [form, fields] = useForm({
			id: "create-task",
			constraint: getZodConstraint(createTaskSchema),
			defaultValue: {
				priority: Priority.NONE.toString(),
				statusId: statuses.find((s) => s.isDefault)?.id || statuses[0]?.id,
			},
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: createTaskSchema }),
			onSubmit: (e, { submission }) => {
				e.preventDefault();
				if (submission?.status !== "success") return;

				const { title, description, statusId, assigneeId, priority, dueDate } =
					submission.value;

				const clientShortID = getAndIncrementNextShortId(workspaceId);

				// Fire mutation - dialog closes optimistically, errors show toast
				z.mutate(
					mutators.matter.create({
						workspaceId,
						workspaceCode,
						title,
						description,
						type: matterType.task,
						statusId,
						assigneeId: assigneeId ?? undefined,
						priority: Number(priority),
						dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
						clientShortID,
					}),
				).server.catch(() => toast.error("Failed to create task"));

				setOpen(false);
				toast.success(`${workspaceCode}-${clientShortID} created`);
			},
		});

		return (
			<Dialog onOpenChange={setOpen} open={open}>
				<DialogTrigger asChild>
					{triggerButton || (
						<Button size="sm">
							<Plus className="mr-1 size-4" />
							Task
						</Button>
					)}
				</DialogTrigger>
				<DialogContent className="max-w-2xl overflow-hidden border-none p-0 shadow-2xl focus:outline-none">
					<DialogTitle className="sr-only">New Task</DialogTitle>
					<DialogDescription className="sr-only">
						Create a new task in this workspace
					</DialogDescription>

					<form {...getFormProps(form)} className="flex flex-col bg-background">
						{/* Content Section */}
						<div className="space-y-4 p-6">
							<div className="flex items-center gap-2 font-bold text-[10px] text-muted-foreground uppercase tracking-tighter">
								<ListTodo className="size-3" /> {workspaceCode} / New Task
							</div>

							<input
								{...getInputProps(fields.title, { type: "text" })}
								key={fields.title.key}
								autoFocus
								autoComplete="off"
								placeholder="Task title"
								className="w-full bg-transparent font-semibold text-xl outline-none placeholder:text-muted-foreground/30"
							/>
							{fields.title.errors && (
								<p className="font-medium text-[10px] text-destructive">
									{fields.title.errors}
								</p>
							)}

							<textarea
								{...getInputProps(fields.description, { type: "text" })}
								key={fields.description.key}
								placeholder="Description..."
								className="min-h-30 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
							/>
						</div>

						{/* Metadata/Actions Footer */}
						<div className="flex flex-col gap-3 border-t bg-muted/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-wrap items-center gap-1">
								{/* Custom Selectors - Memoized for performance */}
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
									value={fields.assigneeId.value ?? null}
									members={workspaceMembers}
									onChange={(v) =>
										form.update({
											name: fields.assigneeId.name,
											value: v ?? undefined,
										})
									}
									showLabel
									className="h-7 border bg-background px-2"
								/>

								{/* Due Date Picker */}
								<div className="relative">
									<input
										{...getInputProps(fields.dueDate, { type: "date" })}
										key={fields.dueDate.key}
										className="h-7 rounded border bg-background px-2 text-[11px] text-muted-foreground outline-none hover:bg-muted focus:ring-1 focus:ring-ring"
									/>
								</div>
							</div>

							<div className="flex items-center justify-end gap-3">
								<span className="hidden text-[10px] text-muted-foreground lg:block">
									<kbd className="font-sans">⌘</kbd> Enter
								</span>
								<Button
									type="submit"
									size="sm"
									className="h-8 px-4 font-medium"
								>
									Create Task
								</Button>
							</div>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
