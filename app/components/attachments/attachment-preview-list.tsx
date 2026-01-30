"use client";

import { ExternalLink, FileIcon, XIcon, ZoomInIcon } from "lucide-react";
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
					const url = a.publicUrl || "";
					const isImg = a.fileType.startsWith("image/");
					return (
						<div
							key={a.id}
							className={cn(
								"group relative overflow-hidden rounded border bg-background hover:shadow-md",
								c ? "aspect-[4/3]" : "aspect-square",
							)}
						>
							{isImg ? (
								<img
									src={url}
									alt={a.fileName}
									className="h-full w-full object-cover transition-transform group-hover:scale-105"
									loading="lazy"
								/>
							) : (
								<div
									className={cn(
										"flex h-full w-full flex-col items-center justify-center bg-muted/50",
										c ? "gap-1 p-2" : "gap-2 p-4",
									)}
								>
									<div
										className={cn(
											"flex items-center justify-center rounded-lg bg-muted",
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
									<span
										className={cn(
											"font-medium text-muted-foreground",
											c ? "text-[10px]" : "text-xs",
										)}
									>
										{ext(a.fileName)}
									</span>
								</div>
							)}
							<div
								className={cn(
									"absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100",
									c ? "p-1.5" : "p-3",
								)}
							>
								<div className="flex justify-end gap-1">
									{isImg && (
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
											<ExternalLink className={c ? "h-3 w-3" : "h-3.5 w-3.5"} />
										</a>
									</Button>
								</div>
								<div className="space-y-0.5">
									<p className="truncate font-medium text-[10px] text-white">
										{a.fileName}
									</p>
									{!c && (
										<p className="text-[10px] text-white/70">
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
				<button
					type="button"
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
					onClick={() => setSelected(null)}
				>
					<div className="relative max-h-[90vh] max-w-[90vw]">
						<img
							src={selected}
							alt="Preview"
							className="max-h-[85vh] max-w-[85vw] rounded-lg shadow-2xl"
						/>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="absolute -top-3 -right-3 h-8 w-8 rounded-full border-2 border-white bg-white"
							onClick={() => setSelected(null)}
						>
							<XIcon className="h-4 w-4" />
						</Button>
					</div>
				</button>
			)}
		</div>
	);
}
