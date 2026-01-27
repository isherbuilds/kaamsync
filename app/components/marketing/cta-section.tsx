import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface MarketingCTAProps {
	title?: ReactNode;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
}

export function MarketingCTA({
	title = "Still have questions?",
	description = "Our support team is standing by to help you choose the right plan for your business.",
	action = (
		<Button
			size="lg"
			className="h-14 bg-primary px-10 font-bold text-lg text-white hover:bg-primary/90"
			asChild
		>
			<Link to="/contact">Contact Sales</Link>
		</Button>
	),
	className,
}: MarketingCTAProps) {
	return (
		<section
			className={cn(
				"bg-foreground py-24 text-center text-background",
				className,
			)}
		>
			<div className="container mx-auto px-4 md:px-6">
				<div className="mx-auto max-w-3xl">
					{typeof title === "string" ? (
						<h2 className="mb-8 font-medium font-serif text-4xl tracking-tight md:text-5xl">
							{title}
						</h2>
					) : (
						<div className="mb-8">{title}</div>
					)}
					<div className="mx-auto mb-12 max-w-xl text-background/70 text-lg">
						{description}
					</div>
					{action}
				</div>
			</div>
		</section>
	);
}
