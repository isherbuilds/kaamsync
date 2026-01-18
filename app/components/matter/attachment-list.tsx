import { Download, FileIcon, Loader2, Trash2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { toast } from "sonner";
import type { AttachmentsTable, UsersTable } from "zero/schema";
import { useAttachments } from "~/hooks/use-attachments";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

interface AttachmentListProps {
	attachments: readonly (AttachmentsTable & {
		readonly uploader?: UsersTable | null;
	})[];
	canDelete: boolean;
	className?: string;
}

function getFileIcon(type: string) {
	if (type.startsWith("image/")) return <FileIcon className="size-5" />;
	if (type.includes("pdf")) return <FileIcon className="size-5 text-red-500" />;
	if (type.includes("sheet") || type.includes("csv"))
		return <FileIcon className="size-5 text-green-500" />;
	if (type.includes("zip") || type.includes("compressed"))
		return <FileIcon className="size-5 text-yellow-500" />;
	return <FileIcon className="size-5" />;
}

function formatBytes(bytes: number) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatTimeAgo(timestamp: number) {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 7) {
		return new Date(timestamp).toLocaleDateString();
	}
	if (days > 0) {
		return `${days}d ago`;
	}
	if (hours > 0) {
		return `${hours}h ago`;
	}
	if (minutes > 0) {
		return `${minutes}m ago`;
	}
	return "Just now";
}

export const AttachmentList = memo(function AttachmentList({
	attachments,
	canDelete,
	className,
}: AttachmentListProps) {
	const { deleteAttachment } = useAttachments();
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleDelete = useCallback(
		async (id: string, e: React.MouseEvent) => {
			e.preventDefault();
			if (!confirm("Are you sure you want to delete this file?")) return;

			setDeletingId(id);
			try {
				const success = await deleteAttachment(id);
				if (success) {
					toast.success("File deleted");
				} else {
					toast.error("Failed to delete file");
				}
			} catch {
				toast.error("Failed to delete file");
			} finally {
				setDeletingId(null);
			}
		},
		[deleteAttachment],
	);

	if (attachments.length === 0) {
		return null;
	}

	return (
		<div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-3", className)}>
			{attachments.map((file) => (
				<div
					key={file.id}
					className="group relative flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
				>
					<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
						{getFileIcon(file.fileType)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<a
								href={`/api/attachments/${file.storageKey}`}
								target="_blank"
								rel="noopener noreferrer"
								className="truncate font-medium text-sm hover:underline"
							>
								{file.fileName}
							</a>
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							<span>{formatBytes(file.fileSize)}</span>
							<span>•</span>
							<span>{file.uploader?.name || "Unknown"}</span>
							<span>•</span>
							<span title={new Date(file.createdAt).toLocaleString()}>
								{formatTimeAgo(file.createdAt)}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-muted-foreground hover:text-foreground"
										asChild
									>
										<a
											href={`/api/attachments/${file.storageKey}?download=true`}
											download
											target="_blank"
											rel="noopener noreferrer"
										>
											<Download className="size-4" />
											<span className="sr-only">Download</span>
										</a>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Download</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						{canDelete && (
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-muted-foreground hover:text-red-600"
											onClick={(e) => handleDelete(file.id, e)}
											disabled={deletingId === file.id}
										>
											{deletingId === file.id ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Trash2 className="size-4" />
											)}
											<span className="sr-only">Delete</span>
										</Button>
									</TooltipTrigger>
									<TooltipContent>Delete</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
					</div>
				</div>
			))}
		</div>
	);
});
