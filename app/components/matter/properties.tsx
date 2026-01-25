import type { ReactNode } from "react";

interface PropertyProps {
	label: string;
	children: ReactNode;
}

export function PropertyPill({ label, children }: PropertyProps) {
	return (
		<div className="flex shrink-0 items-center gap-2 rounded-full border bg-muted/50 px-3 py-1">
			<span className="font-bold text-[10px] text-muted-foreground uppercase tracking-tight">
				{label}
			</span>
			{children}
		</div>
	);
}

export function PropertyRow({ label, children }: PropertyProps) {
	return (
		<div className="space-y-1">
			<span className="ml-1 font-medium text-[11px] text-muted-foreground">
				{label}
			</span>
			<div className="flex-1">{children}</div>
		</div>
	);
}
