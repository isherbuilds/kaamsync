import {
	getInputProps as getConformInputProps,
	getFormProps,
	useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import GitPullRequest from "lucide-react/dist/esm/icons/git-pull-request";
import ListTodo from "lucide-react/dist/esm/icons/list-todo";
import SquarePen from "lucide-react/dist/esm/icons/square-pen";
import { memo, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { AttachmentUpload } from "~/components/attachments/attachment-upload";
import { planLimits } from "~/config/billing";
import { Priority, type PriorityValue } from "~/config/matter";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { useTeamShortIdCache } from "~/hooks/use-short-id";
import { consumeNextShortId } from "~/lib/cache/short-id";
import { matterCreateFormSchema } from "~/lib/matter/validations";
import { cn } from "~/lib/utils";
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
		const [attachments, setAttachments] = useState<{ id: string }[]>([]);
		const [resetSignal, setResetSignal] = useState(0);
		const { subscription } = useOrganizationLoaderData();
		const planKey = subscription?.plan as keyof typeof planLimits | undefined;
		const planLimit = planKey ? planLimits[planKey] : planLimits.starter;
		const normalizedMaxFiles =
			planLimit.maxFiles < 0 ? Number.POSITIVE_INFINITY : planLimit.maxFiles;

		const isRequest = type === "request";
		const {
			dialogTitle,
			dialogAccentClass,
			submitLabel,
			submittingLabel,
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

		const handleAttachmentsChange = useCallback(
			(
				uploaded: {
					id: string;
					publicUrl: string;
					storageKey: string;
					fileName: string;
					fileSize: number;
					fileType: string;
				}[],
			) => {
				setAttachments(uploaded.map((file) => ({ id: file.id })));
			},
			[],
		);

		const handleOpenChange = useCallback(
			(v: boolean) => {
				if (!v && attachments.length > 0 && !isCreating) {
					const attachmentIds = attachments.map((a) => a.id);
					fetch("/api/attachments/cleanup", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ attachmentIds }),
					}).catch(() => {
						// Silent fail - orphaned attachments will be cleaned by periodic job
					});
					setAttachments([]);
					setResetSignal((value) => value + 1);
				}
				setOpen(v);
			},
			[attachments, isCreating],
		);

		const [form, fields] = useForm({
			id: `create-matter-${type}`,
			constraint: getZodConstraint(matterCreateFormSchema),
			defaultValue: {
				priority: (isRequest ? Priority.MEDIUM : Priority.NONE).toString(),
				statusId:
					(statuses || []).find((s) => s.isDefault)?.id || statuses?.[0]?.id,
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
						attachmentIds: attachments.map((attachment) => attachment.id),
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
						setAttachments([]);
						setResetSignal((value) => value + 1);
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
			<Dialog onOpenChange={handleOpenChange} open={open}>
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
				<DialogContent className="max-w-2xl overflow-hidden p-0 focus:outline-none">
					<DialogTitle className="sr-only">{dialogTitle}</DialogTitle>
					<DialogDescription className="sr-only">
						{dialogDescription}
					</DialogDescription>

					<form {...getFormProps(form)} className="flex flex-col bg-background">
						<div className="flex items-center gap-2 border-b px-4 py-3 sm:px-6">
							<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
								<span className="font-medium">{teamCode}</span>
								<span>/</span>
								<span className={dialogAccentClass}>{dialogTitle}</span>
							</div>
						</div>

						<div className="flex-1 space-y-4 p-4 sm:p-6">
							<div className="space-y-1">
								<input
									{...getConformInputProps(fields.title, { type: "text" })}
									key={fields.title.key}
									autoFocus
									autoComplete="off"
									placeholder={titlePlaceholder}
									className="w-full bg-transparent font-semibold text-lg leading-tight outline-none placeholder:text-muted-foreground/40 sm:text-xl"
								/>
								{fields.title.errors && (
									<p className="font-medium text-destructive text-xs">
										{fields.title.errors}
									</p>
								)}
							</div>

							<div className="space-y-1">
								<textarea
									{...getConformInputProps(fields.description, {
										type: "text",
									})}
									key={fields.description.key}
									placeholder={descriptionPlaceholder}
									className="min-h-[120px] w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/40 sm:min-h-[140px] sm:text-base"
								/>
								{fields.description.errors && (
									<p className="font-medium text-destructive text-xs">
										{fields.description.errors}
									</p>
								)}
							</div>

							<AttachmentUpload
								maxFiles={normalizedMaxFiles}
								maxSize={planLimit.maxFileSizeMb * 1024 * 1024}
								accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
								resetSignal={resetSignal}
								onAttachmentsChange={handleAttachmentsChange}
							/>
						</div>

						<div className="flex items-center justify-between gap-4 border-t bg-muted/30 px-4 py-3 sm:px-6">
							<div className="flex flex-wrap items-center gap-2">
								{!isRequest && (
									<StatusSelect
										name={fields.statusId.name}
										value={fields.statusId.value}
										statuses={statuses}
										onChange={(v) =>
											form.update({ name: fields.statusId.name, value: v })
										}
										showLabel
										className="h-7 rounded-md border bg-background px-2 text-xs shadow-sm hover:bg-muted/50"
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
									className="h-7 rounded-md border bg-background px-2 text-xs shadow-sm hover:bg-muted/50"
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
									className="h-7 rounded-md border bg-background px-2 text-xs shadow-sm hover:bg-muted/50"
								/>

								<div className="relative">
									<input
										{...getConformInputProps(fields.dueDate, { type: "date" })}
										key={fields.dueDate.key}
										className="h-7 rounded-md border bg-background px-2 text-muted-foreground text-xs shadow-sm outline-none hover:bg-muted/50 focus:ring-1 focus:ring-ring"
									/>
								</div>
							</div>

							<Button
								type="submit"
								size="sm"
								className={cn(
									"h-8 px-5 font-medium shadow-sm",
									isRequest && "bg-brand-requests hover:bg-brand-requests/90",
								)}
								disabled={isCreating}
							>
								{isCreating ? submittingLabel : submitLabel}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		);
	},
);
