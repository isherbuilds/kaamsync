"use client";

import { useZero } from "@rocicorp/zero/react";
import { useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { AttachmentUpload } from "~/components/attachments/attachment-upload";
import { Button } from "~/components/ui/button";
import { planLimits } from "~/config/billing";
import { useOrganizationLoaderData } from "~/hooks/use-loader-data";
import { cn } from "~/lib/utils";

interface CommentComposerProps {
	matterId: string;
	className?: string;
}

export function CommentComposer({ matterId, className }: CommentComposerProps) {
	const z = useZero();
	const { subscription } = useOrganizationLoaderData();
	const planKey = subscription?.plan as keyof typeof planLimits | undefined;
	const planLimit = planKey ? planLimits[planKey] : planLimits.starter;
	const normalizedMaxFiles =
		planLimit.maxFiles < 0 ? Number.POSITIVE_INFINITY : planLimit.maxFiles;

	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [attachments, setAttachments] = useState<{ id: string }[]>([]);
	const [resetSignal, setResetSignal] = useState(0);

	const handleSubmit = async () => {
		if (!content.trim()) {
			toast.error("Comment cannot be empty");
			return;
		}
		setIsSubmitting(true);
		try {
			await z.mutate(
				mutators.timeline.addComment({
					matterId,
					content: content.trim(),
					attachmentIds: attachments.map((attachment) => attachment.id),
				}),
			).server;
			setContent("");
			setAttachments([]);
			setResetSignal((value) => value + 1);
			toast.success("Comment added");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to add comment",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className={cn("space-y-3 sm:space-y-4", className)}>
			<textarea
				value={content}
				onChange={(event) => setContent(event.target.value)}
				placeholder="Write a comment..."
				className="min-h-20 w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:border-ring focus:ring-2 focus:ring-ring sm:min-h-24 sm:px-4 sm:py-3 sm:text-base"
			/>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<AttachmentUpload
					maxFiles={normalizedMaxFiles}
					maxSize={planLimit.maxFileSizeMb * 1024 * 1024}
					accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
					resetSignal={resetSignal}
					onAttachmentsChange={(uploaded) =>
						setAttachments(uploaded.map((file) => ({ id: file.id })))
					}
				/>
				<div className="flex justify-end">
					<Button
						type="button"
						size="sm"
						onClick={handleSubmit}
						disabled={isSubmitting || !content.trim()}
					>
						{isSubmitting ? "Posting..." : "Post comment"}
					</Button>
				</div>
			</div>
		</div>
	);
}
