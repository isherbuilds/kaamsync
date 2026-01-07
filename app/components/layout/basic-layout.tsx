import { ArrowLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function BasicLayout({
	title,
	description,
	children,
	contentClassName,
}: {
	title: string;
	description: string;
	children: React.ReactNode;
	contentClassName?: string;
}) {
	return (
		<div className="flex h-dvh w-full flex-col items-center justify-center bg-background px-4">
			<Button
				asChild
				type="button"
				className="fixed top-4 left-4"
				size="sm"
				variant="ghost"
			>
				<Link reloadDocument to="/">
					<ArrowLeftIcon className="size-4" /> Home
				</Link>
			</Button>
			<div className={cn("mx-auto w-96 -translate-y-8", contentClassName)}>
				<div className="flex flex-col gap-6">
					<div className="flex flex-col items-center gap-1 text-center">
						<h1 className="font-semibold text-lg">{title}</h1>
						<p className="text-balance text-muted-foreground text-sm">
							{description}
						</p>
					</div>
					{children}
				</div>
			</div>
		</div>
	);
}
