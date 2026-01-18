import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { createId } from "@paralleldrive/cuid2";
import type { Row } from "@rocicorp/zero";
import { useZero } from "@rocicorp/zero/react";
import {
	AlertCircle,
	GitPullRequest,
	ListTodo,
	Paperclip,
	SquarePen,
	X,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { useAttachments } from "~/hooks/use-attachments";
import { useShortIdSeeder } from "~/hooks/use-short-id";
import { Priority, type PriorityValue } from "~/lib/constants/matter";
import { getAndIncrementNextShortId } from "~/lib/infra/short-id-cache";
import { cn } from "~/lib/utils";
import { createMatterSchema } from "~/lib/validations/matter";
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
	orgId: string;
	statuses: readonly Row["statusesTable"][];
	teamMembers: readonly MemberSelectorItem[];
	triggerButton?: React.ReactNode;
}

export const MatterDialog = memo(
	({
		type,
		teamId,
		teamCode,
		orgId,
		statuses,
		teamMembers,
		triggerButton,
	}: MatterDialogProps) => {
		const z = useZero();
		const [open, setOpen] = useState(false);
		const [isSubmitting, setIsSubmitting] = useState(false);
		const [files, setFiles] = useState<File[]>([]);
		const { uploadFile } = useAttachments();
		const fileInputRef = useRef<HTMLInputElement>(null);
		const [limitStatus, setLimitStatus] = useState<{
			canCreateMatter: boolean;
			currentMatters: number;
			matterLimit: number;
			matterRemaining: number;
			matterMessage: string | null;
		} | null>(null);

		const isRequest = type === "request";
		const Icon = isRequest ? GitPullRequest : ListTodo;
		const label = isRequest ? "New Request" : "New Task";
		const accentColor = isRequest ? "text-brand-requests" : "text-brand-tasks";
		const submitLabel = isRequest ? "Submit Request" : "Create Task";
		const submittingLabel = isRequest ? "Submitting..." : "Creating...";

		const canSubmit = limitStatus === null || limitStatus.canCreateMatter;
		const showWarning = limitStatus !== null && !limitStatus.canCreateMatter;

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

		const fetchLimitStatus = useCallback(async () => {
			try {
				const response = await fetch("/api/billing/check-limits");
				if (response.ok) {
					const data = await response.json();
					setLimitStatus({
						canCreateMatter: data.canCreateMatter,
						currentMatters: data.currentMatters,
						matterLimit: data.matterLimit,
						matterRemaining: data.matterRemaining,
						matterMessage: data.matterMessage,
					});
				}
			} catch (error) {
				console.error("Failed to fetch matter limit status:", error);
			}
		}, []);

		useEffect(() => {
			if (open) {
				fetchLimitStatus();
			} else {
				setLimitStatus(null);
			}
		}, [open, fetchLimitStatus]);

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
				const matterId = createId();

				setIsSubmitting(true);
				z.mutate(
					mutators.matter.create({
						id: matterId,
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
					.server.then(async () => {
						// Upload files if any
						if (files.length > 0) {
							const uploadPromises = files.map((file) =>
								uploadFile(file, matterId),
							);
							await Promise.allSettled(uploadPromises);
						}

						toast.success(
							isRequest
								? "Request submitted for approval"
								: `${teamCode}-${clientShortID} created`,
						);
						setOpen(false);
						form.reset();
						setFiles([]);

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

		const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
			if (e.target.files?.length) {
				setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
				// Reset input so same file can be selected again if needed (though we just append)
				e.target.value = "";
			}
		};

		const removeFile = (index: number) => {
			setFiles((prev) => prev.filter((_, i) => i !== index));
		};

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

					{showWarning && (
						<div className="flex items-center gap-2 border-b bg-destructive/10 p-4 text-destructive text-sm">
							<AlertCircle className="size-4 shrink-0" />
							<div className="flex-1">
								{limitStatus?.matterMessage ||
									`Matter limit reached (${limitStatus?.currentMatters}/${limitStatus?.matterLimit}).`}
							</div>
							<Link to="/settings/billing">
								<Button size="sm" variant="destructive">
									Upgrade
								</Button>
							</Link>
						</div>
					)}

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

							{/* Attachment Selection */}
							<div>
								<div className="flex flex-wrap gap-2">
									{files.map((file, i) => (
										<div
											key={`${file.name}-${i}`}
											className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs"
										>
											<span className="max-w-[150px] truncate">
												{file.name}
											</span>
											<button
												type="button"
												onClick={() => removeFile(i)}
												className="text-muted-foreground hover:text-foreground"
											>
												<X className="size-3" />
											</button>
										</div>
									))}
								</div>
								<input
									type="file"
									multiple
									ref={fileInputRef}
									className="hidden"
									onChange={handleFileSelect}
								/>
							</div>
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

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="size-7 text-muted-foreground hover:text-foreground"
									onClick={() => fileInputRef.current?.click()}
									title="Attach files"
								>
									<Paperclip className="size-4" />
								</Button>
							</div>

							<div className="flex items-center justify-end gap-3">
								<Button
									type="submit"
									size="sm"
									className={cn(
										"h-8 px-4 font-medium",
										isRequest && "bg-brand-requests hover:bg-brand-requests/90",
									)}
									disabled={isSubmitting || !canSubmit}
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
