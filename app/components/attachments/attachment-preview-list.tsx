"use client";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import FileIcon from "lucide-react/dist/esm/icons/file";
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
	if (!attachments.length) return null;

	const c = compact;
	const gridClass = c
		? "grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2"
		: "grid-cols-4 md:grid-cols-5 gap-3";

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
								"group relative overflow-hidden rounded border bg-background hover:shadow-md",
								c ? "aspect-[4/3]" : "aspect-square",
							)}
						>
							{isImg && url ? (
								<img
									src={url}
									alt={a.fileName}
									className="h-full w-full object-cover transition-transform group-hover:scale-105"
									loading="lazy"
								/>
							) : (
								<div
									className={cn(
										"center flex h-full w-full flex-col bg-muted/50",
										c ? "gap-1 p-2" : "gap-2 p-4",
									)}
								>
									<div
										className={cn(
											"center flex rounded-lg bg-muted",
											c ? "h-6 w-6" : "h-12 w-12",
										)}
									>
										<FileIcon
											className={cn(
												"text-muted-foreground",
												c ? "h-3 w-3" : "h-6 w-6",
											)}
										/>
									</div>
									<span className="font-medium text-muted-foreground text-xs">
										{ext(a.fileName)}
									</span>
								</div>
							)}
							<div
								className={cn(
									"v-stack absolute inset-0 justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100",
									c ? "p-1.5" : "p-3",
								)}
							>
								<div className="flex justify-end gap-1">
									{isImg && url && (
										<Button
											type="button"
											variant="secondary"
											size="icon"
											className={cn(
												"bg-white/90 hover:bg-white",
												c ? "h-5 w-5" : "h-7 w-7",
											)}
											onClick={() => setSelected(url)}
										>
											<ZoomInIcon className={c ? "h-3 w-3" : "h-3.5 w-3.5"} />
										</Button>
									)}
									{url && (
										<Button
											type="button"
											variant="secondary"
											size="icon"
											className={cn(
												"bg-white/90 hover:bg-white",
												c ? "h-5 w-5" : "h-7 w-7",
											)}
											asChild
										>
											<a href={url} target="_blank" rel="noreferrer">
												<ExternalLink
													className={c ? "h-3 w-3" : "h-3.5 w-3.5"}
												/>
											</a>
										</Button>
									)}
								</div>
								<div className="space-y-0.5">
									<p className="truncate font-medium text-white text-xs">
										{a.fileName}
									</p>
									{!c && (
										<p className="text-white/70 text-xs">
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
					<div className="relative max-h-[90vh] max-w-[90vw]">
						<img
							src={selected}
							alt="Preview"
							className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
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
