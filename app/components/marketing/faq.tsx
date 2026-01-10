import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export interface FAQItemData {
	q: string;
	a: string;
}

interface FAQItemProps extends FAQItemData {}

export function FAQItem({ q, a }: FAQItemProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="group border-border/60 border-b last:border-0">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex w-full items-center justify-between py-6 text-left transition-all hover:text-primary"
			>
				<span className="font-serif text-xl tracking-tight md:text-2xl">
					{q}
				</span>
				<Plus
					className={cn(
						"h-5 w-5 shrink-0 transition-transform duration-300",
						isOpen && "rotate-45",
					)}
				/>
			</button>
			<div
				className={cn(
					"grid transition-all duration-300 ease-in-out",
					isOpen
						? "grid-rows-[1fr] pb-6 opacity-100"
						: "grid-rows-[0fr] opacity-0",
				)}
			>
				<div className="overflow-hidden">
					<p className="max-w-3xl text-lg text-muted-foreground leading-relaxed">
						{a}
					</p>
				</div>
			</div>
		</div>
	);
}

interface FAQProps {
	items: FAQItemData[];
}

export function FAQ({ items }: FAQProps) {
	return (
		<div className="border-border/60 border-t">
			{items.map((faq) => (
				<FAQItem key={faq.q} {...faq} />
			))}
		</div>
	);
}
