import { cn } from "~/lib/utils";

interface MarketingContainerProps {
	children: React.ReactNode;
	className?: string;
	id?: string;
	variant?: "default" | "hero" | "compact" | "cta";
}

const containerVariants = {
	default: "py-24",
	hero: "pt-24 pb-32",
	compact: "py-16",
	cta: "py-20",
};

export function MarketingContainer({
	children,
	className,
	id,
	variant = "default",
}: MarketingContainerProps) {
	return (
		<section
			id={id}
			className={cn("overflow-hidden", containerVariants[variant], className)}
		>
			<div className="container mx-auto px-4 md:px-6">{children}</div>
		</section>
	);
}

interface MarketingHeadingProps {
	children: React.ReactNode;
	className?: string;
	as?: "h1" | "h2" | "h3";
	italic?: string;
}

const headingStyles = {
	h1: {
		size: "text-5xl md:text-7xl lg:text-8xl leading-[1.1]",
		margin: "mb-8",
	},
	h2: {
		size: "text-4xl md:text-5xl lg:text-6xl",
		margin: "mb-6",
	},
	h3: {
		size: "text-2xl md:text-3xl",
		margin: "mb-4",
	},
};

export function MarketingHeading({
	children,
	className,
	as: Component = "h2",
	italic,
}: MarketingHeadingProps) {
	const baseStyles = "font-medium font-serif tracking-tight";
	const styles = headingStyles[Component];

	return (
		<Component
			className={cn(baseStyles, styles.size, styles.margin, className)}
		>
			{children}
			{italic ? (
				<span className="text-muted-foreground italic">{italic}</span>
			) : null}
		</Component>
	);
}

export function MarketingBadge({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-6 inline-flex border border-border bg-muted/40 px-3 py-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
			{children}
		</div>
	);
}
