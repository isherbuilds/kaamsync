import { useZero } from "@rocicorp/zero/react";
import { useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

interface CommentInputProps {
	matterId: string;
}

export function CommentInput({ matterId }: CommentInputProps) {
	const z = useZero();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Sanitize comment: trim, collapse whitespace, enforce max length
	const sanitizeComment = (text: string) => {
		return text.trim().slice(0, 5000);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const sanitized = sanitizeComment(content);
		if (!sanitized || isSubmitting) return;

		setIsSubmitting(true);
		z.mutate(mutators.timeline.addComment({ matterId, content: sanitized }))
			.server.then(() => {
				setContent("");
				toast.success("Comment added");
			})
			.catch((err) => {
				toast.error("Failed to add comment");
				console.error("Comment mutation failed:", err);
			})
			.finally(() => setIsSubmitting(false));
	};

	// Support Cmd/Ctrl+Enter to submit
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex gap-2">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Add a comment... (⌘+Enter to submit)"
				rows={2}
				className="min-h-15 resize-none text-sm"
				disabled={isSubmitting}
			/>
			<Button
				type="submit"
				size="sm"
				className="shrink-0 self-end"
				disabled={!content.trim() || isSubmitting}
			>
				{isSubmitting ? "..." : "Send"}
			</Button>
		</form>
	);
}
