import { cn } from "~/lib/utils";

interface MarketingContainerProps {
	children: React.ReactNode;
	className?: string;
	id?: string;
}

export function MarketingContainer({
	children,
	className,
	id,
}: MarketingContainerProps) {
	return (
		<section id={id} className={cn("overflow-hidden py-16", className)}>
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

export function MarketingHeading({
	children,
	className,
	as: Component = "h2",
	italic,
}: MarketingHeadingProps) {
	const baseStyles = "font-medium font-serif tracking-tight";
	const variantStyles = {
		h1: "text-5xl md:text-7xl lg:text-8xl leading-[1.1]",
		h2: "text-4xl md:text-5xl lg:text-6xl",
		h3: "text-2xl md:text-3xl",
	};

	return (
		<Component className={cn(baseStyles, variantStyles[Component], className)}>
			{children}
			{italic ? <span className="text-muted-foreground italic">{italic}</span> : null}
		</Component>
	);
}

export function MarketingBadge({ children }: { children: React.ReactNode }) {
	return (
		<div className="mb-6 inline-flex border border-border bg-muted/50 px-3 py-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
			{children}
		</div>
	);
}
