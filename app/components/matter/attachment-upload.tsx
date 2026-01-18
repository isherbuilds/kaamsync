import { CloudUpload, FileArchive, Loader2, Save } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAttachments } from "~/hooks/use-attachments";
import { cn } from "~/lib/utils";
import { Progress } from "../ui/progress";

interface AttachmentUploadProps {
	matterId: string;
	className?: string;
	onUploadComplete?: () => void;
}

function getStatusIcon(status: string) {
	switch (status) {
		case "compressing":
			return <FileArchive className="size-4 animate-pulse" />;
		case "saving":
			return <Save className="size-4" />;
		case "uploading":
			return <Loader2 className="size-4 animate-spin" />;
		case "complete":
			return <CloudUpload className="size-4" />;
		default:
			return <Loader2 className="size-4 animate-spin" />;
	}
}

function getStatusMessage(status: string) {
	switch (status) {
		case "compressing":
			return "Compressing image...";
		case "saving":
			return "Finalizing...";
		case "uploading":
			return "Uploading to storage...";
		case "complete":
			return "Complete!";
		case "error":
			return "Upload failed";
		default:
			return "Processing...";
	}
}

export function AttachmentUpload({
	matterId,
	className,
	onUploadComplete,
}: AttachmentUploadProps) {
	const { uploadFile, uploading, progressMap, absoluteMaxFileSize } =
		useAttachments({
			onUploadComplete: (result) => {
				toast.success("File uploaded successfully");
				onUploadComplete?.();
			},
			onError: (error) => toast.error(error),
		});

	const [isDragging, setIsDragging] = useState(false);
	const [activeFileId, setActiveFileId] = useState<string | null>(null);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);

			const files = Array.from(e.dataTransfer.files);
			if (files.length === 0) return;

			const file = files[0];
			await uploadFile(file, matterId);
		},
		[uploadFile, matterId],
	);

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0) return;

			const file = files[0];
			await uploadFile(file, matterId);

			e.target.value = "";
		},
		[uploadFile, matterId],
	);

	return (
		<div
			className={cn(
				"relative rounded-lg border-2 border-muted-foreground/25 border-dashed transition-colors",
				isDragging && "border-primary bg-primary/5",
				className,
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
				{uploading && activeFileId ? (
					<div className="flex w-full max-w-xs flex-col gap-2 p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="truncate font-medium">
								{progressMap.get(activeFileId)?.fileName}
							</span>
							<span className="text-muted-foreground">
								{Math.round(progressMap.get(activeFileId)?.progress ?? 0)}%
							</span>
						</div>
						<Progress
							value={progressMap.get(activeFileId)?.progress}
							className="h-2"
						/>
						<div className="flex items-center justify-center gap-1.5 text-muted-foreground text-xs">
							{getStatusIcon(progressMap.get(activeFileId)?.status ?? "")}
							<span>
								{getStatusMessage(progressMap.get(activeFileId)?.status ?? "")}
							</span>
						</div>
						{progressMap.get(activeFileId)?.status === "error" &&
							progressMap.get(activeFileId)?.error && (
								<p className="text-destructive text-xs">
									{progressMap.get(activeFileId)?.error}
								</p>
							)}
					</div>
				) : (
					<>
						<div className="rounded-full bg-muted p-3">
							<CloudUpload className="size-6 text-muted-foreground" />
						</div>
						<div className="space-y-1">
							<p className="font-medium text-sm">
								<label
									htmlFor="file-upload"
									className="cursor-pointer text-primary hover:underline"
								>
									Click to upload
								</label>{" "}
								or drag and drop
							</p>
							<p className="text-muted-foreground text-xs">
								Max size {absoluteMaxFileSize / (1024 * 1024)}MB
							</p>
						</div>
						<input
							id="file-upload"
							type="file"
							className="hidden"
							onChange={handleFileSelect}
						/>
					</>
				)}
			</div>
		</div>
	);
}
