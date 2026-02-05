"use client";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import FileIcon from "lucide-react/dist/esm/icons/file";
import Loader2Icon from "lucide-react/dist/esm/icons/loader-2";
import XIcon from "lucide-react/dist/esm/icons/x";
import ZoomInIcon from "lucide-react/dist/esm/icons/zoom-in";
import { useState } from "react";
import { formatBytes } from "~/hooks/use-file-upload";
import { cn } from "~/lib/utils";
import { Button } from "../ui/button";

export type AttachmentItem = {
	id: string;
	fileName: string;
	fileType: string;
	fileSize: number;
	storageKey: string;
	publicUrl?: string | null;
};

interface AttachmentPreviewListProps {
	attachments: AttachmentItem[];
	className?: string;
	compact?: boolean;
}

const ext = (fileName: string) =>
	fileName.slice(fileName.lastIndexOf(".") + 1).toUpperCase();

export function AttachmentPreviewList({
	attachments,
	className,
	compact,
}: AttachmentPreviewListProps) {
	const [selected, setSelected] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	if (!attachments.length) return null;

	const handleSelect = (url: string) => {
		setSelected(url);
		setIsLoading(true);
	};

	const c = compact;
	const gridClass = c
		? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
		: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3";

	return (
		<div className={cn(c ? "space-y-2" : "space-y-3", className)}>
			<div className={cn("grid", gridClass)}>
				{attachments.map((a) => {
					const url = a.publicUrl ?? null;
					const isImg = Boolean(url) && a.fileType.startsWith("image/");
					return (
						<div
							key={a.id}
							className={cn(
								"group relative overflow-hidden rounded-md border bg-background transition-all hover:shadow-sm",
								c ? "aspect-square" : "aspect-video sm:aspect-[4/3]",
							)}
						>
							{isImg && url ? (
								<img
									src={url}
									alt={a.fileName}
									className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
									loading="lazy"
								/>
							) : (
								<div
									className={cn(
					"center flex h-full w-full flex-col bg-muted/20 p-3",
										c ? "gap-1.5" : "gap-3",
									)}
								>
									<div
										className={cn(
					"center flex rounded-lg bg-muted/40",
											c ? "size-8" : "size-12",
										)}
									>
										<FileIcon
											className={cn(
												"text-muted-foreground/70",
												c ? "size-4" : "size-6",
											)}
										/>
									</div>
									<span className="max-w-full truncate font-medium text-muted-foreground text-xs uppercase tracking-wider">
										{ext(a.fileName)}
									</span>
								</div>
							)}

							<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

							<div className="absolute inset-x-0 bottom-0 flex flex-col justify-end p-2.5">
								<div className="mb-2 flex justify-end gap-2">
									{isImg && url && (
										<Button
											type="button"
											variant="secondary"
											size="icon"
											className="size-8 rounded-full bg-background/90 shadow-sm hover:bg-background sm:size-9"
											onClick={() => handleSelect(url)}
										>
											<ZoomInIcon className="size-4 sm:size-5" />
										</Button>
									)}
									{url && (
										<Button
											type="button"
											variant="secondary"
											size="icon"
											className="size-8 rounded-full bg-background/90 shadow-sm hover:bg-background sm:size-9"
											asChild
										>
											<a href={url} target="_blank" rel="noreferrer">
												<ExternalLink className="size-4 sm:size-5" />
											</a>
										</Button>
									)}
								</div>
								<div className="min-w-0">
									<p className="truncate font-medium text-white text-xs drop-shadow-sm sm:text-sm">
										{a.fileName}
									</p>
									{!c && (
										<p className="text-white/80 text-xs drop-shadow-sm">
											{formatBytes(a.fileSize)}
										</p>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>
			{selected && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Image preview"
					className="center fixed inset-0 z-50 flex bg-black/90 p-4 backdrop-blur-sm"
					onClick={() => setSelected(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") {
							setSelected(null);
						}
					}}
				>
					<div className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center">
						{isLoading && (
							<div className="absolute inset-0 flex items-center justify-center">
								<Loader2Icon className="size-8 animate-spin text-white/50" />
							</div>
						)}
						<img
							src={selected}
							alt="Preview"
							className={cn(
								"max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl transition-opacity duration-300",
								isLoading ? "opacity-0" : "opacity-100",
							)}
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
							onLoad={() => setIsLoading(false)}
						/>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="absolute -top-3 -right-3 size-8 rounded-full border-2 border-white bg-white"
							onClick={() => setSelected(null)}
						>
							<XIcon className="size-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
