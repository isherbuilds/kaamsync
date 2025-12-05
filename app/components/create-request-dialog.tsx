import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { CalendarIcon, MessageSquareIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { useZ } from "~/hooks/use-zero-cache";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { getAndIncrementNextShortId } from "~/lib/short-id-cache";
import { cn } from "~/lib/utils";
import { createRequestSchema } from "../lib/validations/matter";
import { InputField, TextareaField } from "./forms";
import { AssigneeSelect, PrioritySelect } from "./matter-field-selectors";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

type WorkspaceMember = {
	userId: string;
	user?: {
		id: string;
		name?: string;
		email?: string;
	};
};

type CreateRequestDialogProps = {
	workspaceId: string;
	workspaceCode: string;
	workspaceName: string;
	onCreated?: (request: { title: string }) => void;
	workspaceMembers: readonly WorkspaceMember[];
	triggerButton?: React.ReactNode;
};

export function CreateRequestDialog({
	workspaceId,
	workspaceCode,
	workspaceName,
	onCreated,
	workspaceMembers,
	triggerButton,
}: CreateRequestDialogProps) {
	const z = useZ();
	const [open, setOpen] = useState(false);
	const [priority, setPriority] = useState<PriorityValue>(Priority.MEDIUM);
	const [dueDate, setDueDate] = useState<string>("");
	const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);

	// Best-effort seeding when dialog opens and online
	useShortIdSeeder(workspaceId, open);

	// Adapt members for AssigneeSelect shape
	const assigneeMembers = useMemo(
		() =>
			workspaceMembers.map((m) => ({
				id: m.user?.id || m.userId,
				userId: m.user?.id || m.userId,
				user: m.user,
			})),
		[workspaceMembers],
	);

	const [form, fields] = useForm({
		constraint: getZodConstraint(createRequestSchema),
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
		defaultValue: {
			priority: Priority.MEDIUM,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: createRequestSchema });
		},
		async onSubmit(event, { formData }) {
			event.preventDefault();
			const submission = parseWithZod(formData, {
				schema: createRequestSchema,
			});
			if (submission.status !== "success") return;
			try {
				const statuses = await z.query.statusesTable
					.where("workspaceId", workspaceId)
					.where("deletedAt", "IS", null)
					.run();
				const defaultStatus = statuses.find((s) => s.isDefault) || statuses[0];
				if (!defaultStatus) {
					toast.error("No status found for workspace");
					return;
				}
				const clientShortID = getAndIncrementNextShortId(workspaceId);
				z.mutate.matter.create({
					workspaceId,
					workspaceCode,
					title: submission.value.title,
					description: submission.value.description,
					type: "request",
					statusId: defaultStatus.id,
					priority,
					assigneeId: assigneeId || undefined,
					dueDate: submission.value.dueDate
						? new Date(submission.value.dueDate).getTime()
						: undefined,
					clientShortID,
				});
				toast.success("Request created successfully");
				onCreated?.(submission.value);
				setOpen(false);
				form.reset();
				setPriority(Priority.MEDIUM);
				setDueDate("");
				setAssigneeId(undefined);
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Failed to create request",
				);
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{triggerButton || (
					<Button size="sm" variant="secondary" className="gap-1.5">
						<MessageSquareIcon className="size-4" />
						<span className="hidden sm:inline">New Request</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="border-none bg-muted p-0 shadow-2xl sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader className="border-b px-3 sm:px-4 py-3 shrink-0">
					<div className="flex items-center gap-2">
						<MessageSquareIcon className="size-4 sm:size-5 text-purple-500 shrink-0" />
						<DialogTitle className="text-sm sm:text-base font-semibold">
							Submit New Request
						</DialogTitle>
					</div>
				</DialogHeader>

				<form {...getFormProps(form)} className="flex flex-col flex-1 min-h-0">
					<div className="space-y-4 p-3 sm:p-4 overflow-y-auto flex-1">
						{/* Info Banner */}
						<div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-900 dark:bg-purple-950/20">
							<p className="text-purple-900 text-xs leading-relaxed dark:text-purple-300">
								💡 Submit a request for review. A manager will review and
								convert it into a task, or reach out if more details are needed.
							</p>
						</div>

						{/* Hidden inputs */}
						<input
							{...getInputProps(fields.priority, { type: "hidden" })}
							value={priority}
						/>

						{/* Title */}
						<InputField
							labelProps={{
								htmlFor: fields.title.id,
								children: "What do you need help with?",
								className: "text-xs",
							}}
							inputProps={{
								...getInputProps(fields.title, { type: "text" }),
								autoFocus: true,
								placeholder: "Describe your request...",
								className: cn(
									"w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-all",
									"placeholder:text-muted-foreground",
									"focus-visible:ring-2 focus-visible:ring-ring/50",
									fields.title.errors && "border-destructive",
								),
							}}
							errors={fields.title.errors}
						/>

						{/* Description */}
						<TextareaField
							labelProps={{
								htmlFor: fields.description.id,
								children: (
									<>
										Additional Details{" "}
										<span className="text-muted-foreground">(optional)</span>
									</>
								),
								className: "text-xs",
							}}
							textareaProps={{
								...getInputProps(fields.description, { type: "text" }),
								placeholder:
									"Provide more context to help us understand your needs...",
								rows: 4,
								className: cn(
									"w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-all",
									"placeholder:text-muted-foreground",
									"focus-visible:ring-2 focus-visible:ring-ring/50",
									fields.description.errors && "border-destructive",
								),
							}}
							errors={fields.description.errors}
						/>

						{/* Metadata Row */}
						<div className="flex flex-wrap items-start sm:items-center gap-2">
							{/* Priority */}
							<PrioritySelect
								value={priority}
								onChange={setPriority}
								showLabel
							/>

							{/* Assignee */}
							<AssigneeSelect
								value={assigneeId || null}
								members={assigneeMembers}
								onChange={(val) => setAssigneeId(val || undefined)}
								align="start"
								showLabel
							/>

							{/* Due Date */}
							<div className="flex items-center gap-1.5">
								<CalendarIcon className="size-3 text-muted-foreground" />
								<input
									{...getInputProps(fields.dueDate, { type: "date" })}
									className={cn(
										"h-8 w-36 cursor-pointer rounded-md border-none bg-slate-400/10 px-2 py-1 text-sm outline-none transition-all",
										"focus-visible:ring-2 focus-visible:ring-ring/50",
										dueDate ? "text-foreground" : "text-muted-foreground",
									)}
									onChange={(e) => setDueDate(e.target.value)}
									value={dueDate}
								/>
							</div>
						</div>
					</div>

					<DialogFooter className="border-t px-3 sm:px-4 py-3 shrink-0">
						<div className="flex w-full items-center justify-between gap-2">
							<p className="text-muted-foreground text-xs hidden sm:block">
								Press{" "}
								<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium font-mono text-[10px] text-muted-foreground">
									Esc
								</kbd>{" "}
								to cancel
							</p>
							<Button size="sm" type="submit" className="ml-auto">
								Submit Request
							</Button>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
