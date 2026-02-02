import ArrowLeftIcon from "lucide-react/dist/esm/icons/arrow-left";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface BasicLayoutProps {
	title: string;
	description: string;
	children: React.ReactNode;
	contentClassName?: string;
}

export function BasicLayout({
	title,
	description,
	children,
	contentClassName,
}: BasicLayoutProps) {
	return (
		<div className="center flex h-dvh w-full flex-col bg-background px-4">
			<Button
				asChild
				type="button"
				className="fixed top-4 left-4"
				size="sm"
				variant="ghost"
			>
				<Link to="/">
					<ArrowLeftIcon className="size-4" /> Home
				</Link>
			</Button>
			<div
				className={cn(
					"mx-auto w-full max-w-sm -translate-y-8",
					contentClassName,
				)}
			>
				<div className="v-stack gap-6">
					<div className="v-stack items-center gap-1 text-center">
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
