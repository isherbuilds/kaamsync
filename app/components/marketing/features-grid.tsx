import { Activity, CheckCircle2, Layout, Lock, Users, Zap } from "lucide-react";

const features = [
	{
		title: "Structured Tasks",
		desc: "Every job has an owner, deadline, and priority. Ambiguity is engineered out.",
		icon: Layout,
	},
	{
		title: "Offline First",
		desc: "Works flawlessly without internet. Syncs automatically when you're back online.",
		icon: Zap,
	},
	{
		title: "Approval Gates",
		desc: "Digital signatures and one-click approvals. Keep a perfect audit trail.",
		icon: CheckCircle2,
	},
	{
		title: "Team Spaces",
		desc: "Keep Finance, HR, and Ops separate. Organizing your business made simple.",
		icon: Users,
	},
	{
		title: "Real-time Telemetry",
		desc: "Live GPS and status updates. Know exactly what's happening on the ground with high-fidelity logs.",
		icon: Activity,
	},
	{
		title: "Enterprise-grade security",
		desc: "Peace of mind-as-a-service. Built with best-in-class security practices, forced HTTPS/TLS encryption, and secure storage via trusted infrastructure partners.",
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
