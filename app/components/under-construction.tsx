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
			className={`mx-auto flex h-full max-w-3xl flex-col justify-center gap-4 p-6 md:items-center ${className} -translate-y-24`}
			aria-label={message}
		>
			<div className="w-fit rounded bg-primary/90 px-3 py-1 text-base text-primary-foreground">
				{route}
			</div>
			<h1 className="flex items-center justify-center gap-2 font-extrabold text-5xl">
				{message}
			</h1>
			<p className="md:text-xl">
				This section is currently under works. Please check back later for
				updates.
			</p>
		</section>
	);
}
