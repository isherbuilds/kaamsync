import type { LucideIcon } from "lucide-react/dist/lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface EmptyStateProps {
	/** Icon to display */
	icon: LucideIcon;
	/** Color class for the icon container background */
	iconColorClass?: string;
	/** Color class for the icon itself */
	iconFillClass?: string;
	/** Main title text */
	title: string;
	/** Description text */
	description: string;
	/** Optional action buttons or other content */
	children?: ReactNode;
	/** Additional className for the container */
	className?: string;
}

/**
 * Reusable empty state component for lists and pages
 * Provides consistent styling for empty states across the app
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={CheckCircle2}
 *   iconColorClass="bg-blue-500/10"
 *   iconFillClass="text-blue-500/50"
 *   title="No tasks assigned"
 *   description="You're all caught up"
 * />
 * ```
 */
export function EmptyState({
	icon: Icon,
	iconColorClass = "bg-primary/10",
	iconFillClass = "text-primary/50",
	title,
	description,
	children,
	className,
}: EmptyStateProps) {
	return (
		<div className={cn("v-stack center py-16 text-center", className)}>
			<div className={cn("rounded-full p-3", iconColorClass)}>
				<Icon className={cn("size-8", iconFillClass)} />
			</div>
			<p className="mt-3 font-medium text-muted-foreground text-sm">{title}</p>
			<p className="mt-1 text-muted-foreground/70 text-xs">{description}</p>
			{children ? <div className="mt-4">{children}</div> : null}
		</div>
	);
}

/**
 * Empty state with dashed border for use in main content areas
 * Best used when the empty state is the main content of a page
 */
export function EmptyStateCard({
	icon: Icon,
	iconColorClass = "bg-primary/10",
	iconFillClass = "text-primary",
	title,
	description,
	children,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
		"center m-4 flex h-full flex-col rounded-lg border-2 border-muted-foreground/20 border-dashed bg-muted/20 p-8 text-center",
				className,
			)}
		>
			<div className="mx-auto max-w-md space-y-4">
				<div
					className={cn(
						"center mx-auto flex size-16 rounded-full",
						iconColorClass,
					)}
				>
					<Icon className={cn("size-8", iconFillClass)} />
				</div>
				<div className="space-y-2">
					<h3 className="font-semibold text-lg">{title}</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				</div>
				{children && (
					<div className="v-stack center gap-2 pt-2 sm:flex-row">
						{children}
					</div>
				)}
			</div>
		</div>
	);
}
