import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import { GitPullRequest } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Form } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { Priority, type PriorityValue } from "~/lib/matter-constants";
import { getAndIncrementNextShortId } from "~/lib/short-id-cache";
import { createRequestSchema } from "~/lib/validations/matter";
import { matterType, workspaceRole } from "../db/helpers";
import { MemberSelect, PrioritySelect } from "./matter-field-selectors";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";

interface CreateRequestDialogProps {
	workspaceId: string;
	workspaceCode: string;
	triggerButton?: React.ReactNode;
	workspaceMembers: readonly Row["workspaceMembershipsTable"][];
	statuses: readonly Row["statusesTable"][];
}

export const CreateRequestDialog = memo(
	({
		workspaceId,
		workspaceCode,
		triggerButton,
		workspaceMembers,
		statuses,
	}: CreateRequestDialogProps) => {
		const z = useZero();

		const [open, setOpen] = useState(false);
		const [isSubmitting, setIsSubmitting] = useState(false);

		const onlyManagers = useMemo(
			() => workspaceMembers.filter((m) => m.role === workspaceRole.manager),
			[workspaceMembers],
		);

		// High-performance Short ID pre-fetching
		useShortIdSeeder(workspaceId, open);

		const [form, fields] = useForm({
			id: "create-request-dialog",
			constraint: getZodConstraint(createRequestSchema),
			defaultValue: {
				priority: Priority.NONE.toString(),
			},
			onValidate: ({ formData }) =>
				parseWithZod(formData, { schema: createRequestSchema }),
			onSubmit: (e, { submission }) => {
				e.preventDefault();

				if (submission?.status !== "success") return;

				const { title, description, assigneeId, priority, dueDate } =
					submission.value;

				const clientShortID = getAndIncrementNextShortId(workspaceId);

				// Use default status or first available
				const defaultStatus = statuses.find((s) => s.isDefault) ?? statuses[0];
				if (!defaultStatus) {
					toast.error("No status available in workspace");
					return;
				}

				setIsSubmitting(true);
				z.mutate(
					mutators.matter.create({
						title,
						description,
						workspaceId,
						workspaceCode,
						assigneeId,
						type: matterType.request,
						priority,
						dueDate: dueDate
							? new Date(dueDate).getTime()
							: Date.now() + 7 * 24 * 60 * 60 * 1000,
						clientShortID,
						statusId: defaultStatus.id,
					}),
				)
					.server.then(() => {
						toast.success("Request submitted for approval");
						setOpen(false);
						form.reset();
					})
					.catch(() => toast.error("Failed to create request"))
					.finally(() => setIsSubmitting(false));
			},
		});

		return (
			<Dialog onOpenChange={setOpen} open={open}>
				<DialogTrigger asChild>
					{triggerButton || (
						<Button variant="outline" size="sm" className="gap-2">
							<GitPullRequest className="size-4" />
							New Request
						</Button>
					)}
				</DialogTrigger>

				<DialogContent className="max-w-2xl overflow-hidden border-none p-0 shadow-2xl focus:outline-none">
					<DialogTitle className="sr-only">New Request</DialogTitle>
					<DialogDescription className="sr-only">
						Create a new approval request for this workspace
					</DialogDescription>

					<form {...getFormProps(form)} className="flex flex-col bg-background">
						<div className="space-y-4 p-6">
							<div className="flex items-center gap-2 font-bold text-[10px] text-orange-500 uppercase tracking-tighter">
								<GitPullRequest className="size-3" /> {workspaceCode} / New
								Approval Request
							</div>

							<input
								{...getInputProps(fields.title, { type: "text" })}
								key={fields.title.key}
								autoFocus
								placeholder="What needs approval?"
								className="w-full bg-transparent font-semibold text-xl outline-none placeholder:text-muted-foreground/30"
							/>

							<textarea
								{...getInputProps(fields.description, { type: "text" })}
								key={fields.description.key}
								placeholder="Provide context for the managers..."
								className="min-h-35 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
							/>
						</div>

						<div className="flex items-center justify-between border-t bg-muted/5 px-4 py-3">
							<div className="flex items-center gap-2">
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
									value={fields.assigneeId.value}
									members={onlyManagers}
									onChange={(v) =>
										form.update({
											name: fields.assigneeId.name,
											value: v ?? undefined,
										})
									}
									showLabel
									className="h-7 border bg-background px-2"
								/>
							</div>

							<div className="flex items-center gap-3">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setOpen(false)}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									size="sm"
									className="bg-orange-600 hover:bg-orange-700"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Submitting..." : "Submit Request"}
								</Button>
							</div>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
