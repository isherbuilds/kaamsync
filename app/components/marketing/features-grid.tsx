import Activity from "lucide-react/dist/esm/icons/activity";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Layout from "lucide-react/dist/esm/icons/layout";
import Lock from "lucide-react/dist/esm/icons/lock";
import Users from "lucide-react/dist/esm/icons/users";
import Zap from "lucide-react/dist/esm/icons/zap";

const features = [
	{
		title: "Everything Has an Owner",
		desc: 'No more "I thought someone else was handling it." Every Matter has a clear owner, deadline, and status. Everyone knows who\'s responsible.',
		icon: Layout,
	},
	{
		title: "Works Without Internet",
		desc: "Your team can log work from anywhere and update status all offline. Everything syncs automatically when they reconnect.",
		icon: Zap,
	},
	{
		title: "Approvals, Tracked",
		desc: "Every approval is logged with a timestamp. Know who approved what, when, and why. No more searching through chat history.",
		icon: CheckCircle2,
	},
	{
		title: "Teams Stay Separate",
		desc: "Finance, HR, and Operations each get their own space. Organized by default. No clutter, no confusion about who's working on what.",
		icon: Users,
	},
	{
		title: "See What's Happening",
		desc: "Real-time status updates show you exactly what's being worked on, what's waiting for approval, and what's done. Complete visibility.",
		icon: Activity,
	},
	{
		title: "Your Data is Safe",
		desc: "Enterprise grade encryption for data in transit and at rest. HTTPS/TLS everywhere. Your work stays private and protected.",
		icon: Lock,
	},
];

export function FeaturesGrid() {
	return (
		<div className="grid grid-cols-1 border-foreground/10 border-t border-l md:grid-cols-3">
			{features.map((feature) => (
				<div
					key={feature.title}
					className="group relative border-foreground/10 border-r border-b p-10 transition-colors hover:bg-muted/30"
				>
					<feature.icon className="mb-6 size-8 stroke-1 text-foreground transition-transform group-hover:scale-110" />
					<h3 className="mb-3 font-medium font-serif text-2xl">
						{feature.title}
					</h3>
					<p className="text-muted-foreground leading-relaxed">
						{feature.desc}
					</p>
				</div>
			))}
		</div>
	);
}
