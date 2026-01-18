import { useZero } from "@rocicorp/zero/react";
import { Paperclip } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useAttachments } from "~/hooks/use-attachments";

interface CommentInputProps {
	matterId: string;
}

export function CommentInput({ matterId }: CommentInputProps) {
	const z = useZero();
	const [content, setContent] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { uploadFile, uploading } = useAttachments({
		onUploadComplete: () => toast.success("File uploaded"),
		onError: (err) => toast.error(err),
	});

	const fileInputRef = useRef<HTMLInputElement>(null);

	const sanitizeComment = useCallback((text: string) => {
		return text.trim().slice(0, 5000);
	}, []);

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;
			await uploadFile(files[0], matterId);
			e.target.value = "";
		},
		[uploadFile, matterId],
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
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
		},
		[content, isSubmitting, matterId, sanitizeComment, z],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				handleSubmit(e);
			}
		},
		[handleSubmit],
	);

	return (
		<form onSubmit={handleSubmit} className="relative">
			<Textarea
				value={content}
				onChange={(e) => setContent(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Add a comment... (⌘+Enter to submit)"
				rows={3}
				className="min-h-[80px] resize-none pb-10 text-sm"
				disabled={isSubmitting}
			/>
			<div className="absolute right-2 bottom-2 flex items-center gap-2">
				<input
					type="file"
					ref={fileInputRef}
					className="hidden"
					onChange={handleFileSelect}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 text-muted-foreground hover:text-foreground"
					onClick={() => fileInputRef.current?.click()}
					disabled={uploading || isSubmitting}
				>
					<Paperclip className="size-4" />
				</Button>
				<Button
					type="submit"
					size="sm"
					disabled={!content.trim() || isSubmitting}
				>
					{isSubmitting ? "..." : "Send"}
				</Button>
			</div>
		</form>
	);
}
