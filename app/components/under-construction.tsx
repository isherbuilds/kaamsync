import { Badge } from "./ui/badge.js";

type Props = {
	message?: string;
	route?: string;
	className?: string;
};

export default function UnderConstruction({
	message = "Under Construction",
	route = "/route",
	className = "",
}: Props) {
	return (
		<section
			className={`h-full flex flex-col md:items-center max-w-3xl mx-auto gap-4 justify-center p-6 ${className} -translate-y-24`}
			aria-label={message}
		>
			<div className="bg-primary/90 rounded w-fit text-primary-foreground px-3 py-1 text-base">
				{route}
			</div>
			<h1 className="font-extrabold text-5xl flex items-center justify-center gap-2">
				{message}
			</h1>
			<p className="md:text-xl">
				This section is currently under works. Please check back later for
				updates.
			</p>
		</section>
	);
}
