import { CloudUpload, Loader2 } from "lucide-react";
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

export function AttachmentUpload({
	matterId,
	className,
	onUploadComplete,
}: AttachmentUploadProps) {
	const { uploadFile, uploading, progress, absoluteMaxFileSize } =
		useAttachments({
			onUploadComplete: () => {
				toast.success("File uploaded successfully");
				onUploadComplete?.();
			},
			onError: (error) => toast.error(error),
		});

	const [isDragging, setIsDragging] = useState(false);

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

			// Handle one file for now (could extend to multiple)
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

			// Reset input
			e.target.value = "";
		},
		[uploadFile, matterId],
	);

	return (
		<div
			className={cn(
				"relative rounded-lg border-2 border-muted-foreground/25 border-dashed transition-colors",
				isDragging && "border-primary bg-primary/5",
				uploading && "pointer-events-none opacity-60",
				className,
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
				{uploading ? (
					<div className="flex w-full max-w-xs flex-col gap-2 p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="truncate font-medium">{progress?.fileName}</span>
							<span className="text-muted-foreground">
								{Math.round(progress?.progress ?? 0)}%
							</span>
						</div>
						<Progress value={progress?.progress} className="h-2" />
						<p className="text-muted-foreground text-xs">
							{progress?.status === "saving"
								? "Finalizing..."
								: "Uploading to storage..."}
						</p>
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
							// accept={allowedTypes.join(",")}
							// Browser check is strict, better to validate in JS for better error messages
						/>
					</>
				)}
			</div>
		</div>
	);
}
