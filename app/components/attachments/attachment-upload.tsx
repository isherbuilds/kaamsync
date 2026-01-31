"use client";

import Paperclip from "lucide-react/dist/esm/icons/paperclip";
import TriangleAlert from "lucide-react/dist/esm/icons/triangle-alert";
import XIcon from "lucide-react/dist/esm/icons/x";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type FileWithPreview,
	formatBytes,
	useFileUpload,
} from "~/hooks/use-file-upload";
import { uploadAttachmentFile } from "~/lib/attachments/client";
import { cn } from "~/lib/utils";
import {
	Alert,
	AlertContent,
	AlertDescription,
	AlertIcon,
	AlertTitle,
} from "../ui/alert";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

type UploadEntry = {
	localId: string;
	status: "idle" | "uploading" | "uploaded" | "error";
	attachmentId?: string;
	publicUrl?: string;
	storageKey?: string;
	fileName?: string;
	fileSize?: number;
	fileType?: string;
	error?: string;
};

export type UploadedAttachment = {
	id: string;
	publicUrl: string;
	storageKey: string;
	fileName: string;
	fileSize: number;
	fileType: string;
};

interface AttachmentUploadProps {
	maxFiles: number;
	maxSize: number;
	accept?: string;
	className?: string;
	onAttachmentsChange: (attachments: UploadedAttachment[]) => void;
	resetSignal?: number;
}

export function AttachmentUpload({
	maxFiles,
	maxSize,
	accept = "*",
	className,
	onAttachmentsChange,
	resetSignal,
}: AttachmentUploadProps) {
	const [uploadEntries, setUploadEntries] = useState<
		Record<string, UploadEntry>
	>({});
	const [uploadedAttachments, setUploadedAttachments] = useState<
		UploadedAttachment[]
	>([]);
	const removedIdsRef = useRef<Set<string>>(new Set());

	const uploadFiles = useCallback(async (filesToUpload: FileWithPreview[]) => {
		const uploadPromises = filesToUpload.map(async (fileItem) => {
			if (!(fileItem.file instanceof File)) return;
			const localId = fileItem.id;
			setUploadEntries((prev) => ({
				...prev,
				[localId]: {
					localId,
					status: "uploading",
					fileName: fileItem.file.name,
					fileSize: fileItem.file.size,
					fileType: fileItem.file.type,
				},
			}));

			try {
				const result = await uploadAttachmentFile(fileItem.file);
				if (removedIdsRef.current.has(localId)) return;
				const attachment: UploadedAttachment = {
					id: result.attachmentId,
					publicUrl: result.publicUrl,
					storageKey: result.storageKey,
					fileName: fileItem.file.name,
					fileSize: fileItem.file.size,
					fileType: fileItem.file.type,
				};
				setUploadedAttachments((prev) => [...prev, attachment]);
				setUploadEntries((prev) => ({
					...prev,
					...(prev[localId]
						? {
								[localId]: {
									...prev[localId],
									status: "uploaded",
									attachmentId: result.attachmentId,
									publicUrl: result.publicUrl,
									storageKey: result.storageKey,
								},
							}
						: {}),
				}));
			} catch (error) {
				if (removedIdsRef.current.has(localId)) return;
				setUploadEntries((prev) => ({
					...prev,
					[localId]: {
						...prev[localId],
						status: "error",
						error: error instanceof Error ? error.message : "Upload failed",
					},
				}));
			}
		});

		await Promise.all(uploadPromises);
	}, []);

	const [state, actions] = useFileUpload({
		maxFiles,
		maxSize,
		accept,
		multiple: true,
		onFilesAdded: (files) => {
			void uploadFiles(files);
		},
		onError: (errors) => {
			setUploadEntries((prev) => ({
				...prev,
				_errors: {
					localId: "_errors",
					status: "error",
					error: errors.join("\n"),
				},
			}));
		},
	});

	const { files, errors } = state;

	const handleRemove = useCallback(
		(fileId: string) => {
			removedIdsRef.current.add(fileId);
			setUploadedAttachments((prev) => {
				const attachmentId = uploadEntries[fileId]?.attachmentId;
				return attachmentId
					? prev.filter((attachment) => attachment.id !== attachmentId)
					: prev;
			});
			setUploadEntries((prev) => {
				const next = { ...prev };
				delete next[fileId];
				return next;
			});
			actions.removeFile(fileId);
		},
		[actions, uploadEntries],
	);

	const prevUploadedAttachmentsRef = useRef<UploadedAttachment[]>([]);
	useEffect(
		function syncUploadedAttachments() {
			const prevIds = prevUploadedAttachmentsRef.current
				.map((a) => a.id)
				.join(",");
			const currentIds = uploadedAttachments.map((a) => a.id).join(",");
			if (prevIds !== currentIds) {
				prevUploadedAttachmentsRef.current = uploadedAttachments;
				onAttachmentsChange(uploadedAttachments);
			}
		},
		[uploadedAttachments, onAttachmentsChange],
	);

	const actionsRef = useRef(actions);
	actionsRef.current = actions;
	useEffect(
		function resetOnSignalChange() {
			if (resetSignal === undefined) return;
			removedIdsRef.current.clear();
			actionsRef.current.clearFiles();
			setUploadEntries({});
			setUploadedAttachments([]);
		},
		[resetSignal],
	);

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<Paperclip className="size-4" /> Attachments
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={actions.openFileDialog}
				>
					Add files
				</Button>
			</div>

			<input {...actions.getInputProps()} className="sr-only" />

			{files.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					Upload files (max{" "}
					{maxFiles === Number.POSITIVE_INFINITY ? "∞" : maxFiles} files,{" "}
					{formatBytes(maxSize)}
					per file)
				</p>
			) : (
				<div className="space-y-2">
					{files.map((fileItem) => {
						const entry = uploadEntries[fileItem.id];
						const isImage =
							fileItem.file instanceof File
								? fileItem.file.type.startsWith("image/")
								: fileItem.file.type.startsWith("image/");
						return (
							<div
								key={fileItem.id}
								className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
							>
								{isImage && fileItem.preview ? (
									<img
										src={fileItem.preview}
										alt={fileItem.file.name}
										className="size-10 rounded-md object-cover"
									/>
								) : (
									<div className="center flex size-10 rounded-md bg-muted text-muted-foreground text-xs">
										{fileItem.file.name.split(".").pop()?.toUpperCase() ??
											"FILE"}
									</div>
								)}
								<div className="flex-1">
									<p className="truncate font-medium text-sm">
										{fileItem.file.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatBytes(fileItem.file.size)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									{entry?.status === "uploading" && (
										<>
											<Spinner className="size-4" aria-label="Uploading" />
											<span className="sr-only">
												Uploading {fileItem.file.name}
											</span>
										</>
									)}
									{entry?.status === "uploaded" && (
										<span className="text-emerald-600 text-xs">Uploaded</span>
									)}
									{entry?.status === "error" && (
										<span className="text-destructive text-xs">Error</span>
									)}
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => handleRemove(fileItem.id)}
										aria-label={`Remove ${fileItem.file.name}`}
									>
										<XIcon className="size-4" />
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{(errors.length > 0 || uploadEntries._errors?.error) && (
				<Alert variant="destructive" appearance="light">
					<AlertIcon>
						<TriangleAlert />
					</AlertIcon>
					<AlertContent>
						<AlertTitle>File upload error(s)</AlertTitle>
						<AlertDescription>
							{uploadEntries._errors?.error && (
								<p>{uploadEntries._errors.error}</p>
							)}
							{errors.map((error) => (
								<p key={error}>{error}</p>
							))}
						</AlertDescription>
					</AlertContent>
				</Alert>
			)}
		</div>
	);
}
