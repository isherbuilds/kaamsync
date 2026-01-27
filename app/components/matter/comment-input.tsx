import { useZero } from "@rocicorp/zero/react";
import { useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

// --- Types ---

interface CommentInputProps {
	matterId: string;
}

// --- Helpers ---

const MAX_COMMENT_LENGTH = 5000;

function sanitizeContent(text: string): string {
	return text.trim().slice(0, MAX_COMMENT_LENGTH);
}

// --- Component ---

export function CommentInput({ matterId }: CommentInputProps) {
	const z = useZero();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const sanitized = sanitizeContent(content);
		if (!sanitized || isSubmitting) return;

		setContent("");
		setIsSubmitting(true);
		z.mutate(mutators.timeline.addComment({ matterId, content: sanitized }))
			.server.catch((err) => {
				setContent(sanitized);
				toast.error("Failed to add comment");
				console.error("Comment mutation failed:", err);
			})
			.finally(() => setIsSubmitting(false));
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleFormSubmit(e);
		}
	};

	const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setContent(e.target.value);
	};

	// --- Render ---

	return (
		<form onSubmit={handleFormSubmit} className="flex gap-2">
			<Textarea
				value={content}
				onChange={handleContentChange}
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
