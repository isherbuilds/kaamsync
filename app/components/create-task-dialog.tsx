import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { CalendarIcon, ListTodoIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { useZ } from "~/hooks/use-zero-cache";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { getAndIncrementNextShortId } from "~/lib/short-id-cache";
import { cn } from "~/lib/utils";
import { matterType } from "../db/helpers";
import { createTaskSchema } from "../lib/validations/matter";
import { InputField, TextareaField } from "./forms";
import {
	AssigneeSelect,
	PrioritySelect,
	StatusSelect,
} from "./matter-field-selectors";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

type WorkspaceMember = {
	userId: string;
	user?: {
		id: string;
		name?: string;
		email?: string;
	};
};

type WorkspaceStatus = {
	id: string;
	name: string;
	type?: string;
	isDefault: boolean | null;
};

type CreateTaskDialogProps = {
	workspaceId: string;
	workspaceCode: string;
	workspaceName: string;
	statuses: WorkspaceStatus[];
	workspaceMembers: readonly WorkspaceMember[];
	triggerButton?: React.ReactNode;
};

export function CreateTaskDialog({
	workspaceId,
	workspaceCode,
	workspaceName,
	statuses,
	workspaceMembers: members,
	triggerButton,
}: CreateTaskDialogProps) {
	const z = useZ();
	const [open, setOpen] = useState(false);

	// Block reservation and cache seeding
	useShortIdSeeder(workspaceId, open);

	// Adapt members for AssigneeSelect shape (ensure stable id)
	const assigneeMembers = useMemo(
		() =>
			members.map((m) => ({
				id: m.user?.id || m.userId,
				userId: m.user?.id || m.userId,
				user: m.user,
			})),
		[members],
	);

	const defaultStatusId =
		statuses.find((s) => s.isDefault)?.id || statuses[0]?.id;
	const defaultAssigneeId =
		members[0]?.user?.id || members[0]?.userId || undefined;

	const [form, fields] = useForm({
		id: "create-task-form",
		constraint: getZodConstraint(createTaskSchema),
		defaultValue: {
			priority: Priority.NONE,
			statusId: defaultStatusId,
			assigneeId: defaultAssigneeId,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createTaskSchema });
		},
		async onSubmit(event, { submission }) {
			event.preventDefault();
			if (submission?.status !== "success") return;
			const { title, description, statusId, priority, assigneeId, dueDate } =
				submission.value;
			const clientShortID = getAndIncrementNextShortId(workspaceId);

			z.mutate.matter.create({
				workspaceId,
				workspaceCode,
				title,
				description,
				type: matterType.task, // Use constant
				statusId,
				priority,
				assigneeId: assigneeId || undefined,
				dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
				clientShortID,
			});
			toast.success("Task created successfully");
			setOpen(false);
			form.reset();
		},
	});

	const statusControl = useInputControl(fields.statusId);
	const priorityControl = useInputControl(fields.priority);
	const assigneeControl = useInputControl(fields.assigneeId);

	return (
		<Dialog onOpenChange={setOpen} open={open}>
			<DialogTrigger asChild>
				{triggerButton || (
					<Button size="sm" className="gap-1.5">
						<PlusIcon className="size-4" />
						<span className="hidden sm:inline">New Task</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent
				className="border-none bg-muted p-0 shadow-2xl sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
				aria-describedby="create-task-description"
			>
				<DialogTitle className="flex items-center gap-2 border-b px-3 sm:px-4 py-3 font-medium shrink-0">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<ListTodoIcon className="size-4 sm:size-5 text-blue-500 shrink-0" />
						<span className="text-sm sm:text-base font-semibold">
							Create New Task
						</span>
						<span className="text-muted-foreground hidden sm:inline">·</span>
						<Badge
							variant="secondary"
							className="text-xs hidden sm:inline-flex"
						>
							{workspaceName}
						</Badge>
					</div>
				</DialogTitle>
				<form
					{...getFormProps(form)}
					className="flex flex-col flex-1 min-h-0"
					aria-describedby={form.errors ? form.errorId : undefined}
				>
					{form.errors && (
						<div
							id={form.errorId}
							className="px-3 sm:px-4 pt-4 text-sm text-destructive"
						>
							{form.errors}
						</div>
					)}
					<div
						className="space-y-4 p-3 sm:p-4 overflow-y-auto flex-1"
						id="create-task-description"
					>
						{/* Hidden inputs for form validation */}
						<input
							{...getInputProps(fields.workspaceId, { type: "hidden" })}
							value={workspaceId}
						/>

						{/* Title Input */}
						<InputField
							inputProps={{
								...getInputProps(fields.title, { type: "text" }),
								autoFocus: true,
								placeholder: "Task title",
								className:
									"w-full bg-transparent font-medium text-lg placeholder:text-muted-foreground focus:outline-none border-none shadow-none focus-visible:ring-0 p-0 h-auto",
							}}
							errors={fields.title.errors}
						/>

						{/* Description */}
						<TextareaField
							labelProps={{ children: "Description", className: "sr-only" }}
							textareaProps={{
								...getInputProps(fields.description, { type: "text" }),
								className:
									"w-full resize-none bg-transparent py-2 text-sm placeholder:text-muted-foreground focus:outline-none border-none shadow-none focus-visible:ring-0 p-0 min-h-[100px]",
								placeholder: "Add description...",
								rows: 4,
							}}
							errors={fields.description.errors}
						/>

						{/* Action Bar */}
						<div className="flex flex-wrap items-start sm:items-center gap-2">
							{/* Status */}
							<StatusSelect
								value={statusControl.value || defaultStatusId || ""}
								statuses={statuses}
								onChange={statusControl.change}
								align="start"
								showLabel
							/>
							<PrioritySelect
								value={
									(priorityControl.value as PriorityValue) ?? Priority.NONE
								}
								onChange={priorityControl.change}
								showLabel
							/>
							<AssigneeSelect
								value={assigneeControl.value || null}
								members={assigneeMembers}
								onChange={assigneeControl.change}
								align="start"
								showLabel
							/>{" "}
							{/* Due Date Input */}
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-1.5">
									<CalendarIcon className="size-3 text-muted-foreground" />
									<input
										{...getInputProps(fields.dueDate, { type: "date" })}
										className={cn(
											"h-8 w-36 cursor-pointer rounded-md border-none bg-slate-400/10 px-2 py-1 text-sm outline-none transition-all",
											"focus-visible:ring-2 focus-visible:ring-ring/50",
											fields.dueDate.value
												? "text-foreground"
												: "text-muted-foreground",
										)}
									/>
								</div>
								{fields.dueDate.errors && (
									<div
										id={fields.dueDate.errorId}
										className="text-xs text-destructive"
									>
										{fields.dueDate.errors}
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="flex items-center justify-between border-t px-3 sm:px-4 py-3 shrink-0 gap-2">
						<p className="text-muted-foreground text-xs hidden sm:block">
							Press{" "}
							<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground">
								Esc
							</kbd>{" "}
							to cancel
						</p>
						<Button
							size="sm"
							type="submit"
							disabled={form.valid === false && form.dirty}
							className="ml-auto"
						>
							Create Task
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
