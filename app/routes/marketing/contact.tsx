import { Mail, MessageSquare } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export const meta: MetaFunction = () => [
	{ title: "Contact - KaamSync Support" },
	{
		name: "description",
		content:
			"Get in touch with the KaamSync team. Support, sales, and general inquiries.",
	},
];

export default function ContactPage() {
	return (
		<>
			{/* Hero */}
			<section className="bg-background py-20 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto mb-16 max-w-3xl text-center">
						<div className="mb-6 inline-flex border border-border bg-muted/50 px-3 py-1 font-mono text-muted-foreground text-xs uppercase tracking-widest">
							Support
						</div>
						<h1 className="mb-6 font-medium font-serif text-5xl tracking-tight md:text-6xl lg:text-7xl">
							Deploy KaamSync <br />
							<span className="text-muted-foreground italic">
								to your field.
							</span>
						</h1>
						<p className="mx-auto max-w-xl text-lg text-muted-foreground">
							Setup takes 2 minutes. For enterprise deployments or custom
							integrations, talk to our engineering team.
						</p>
					</div>

					<div className="mx-auto grid max-w-6xl gap-0 overflow-hidden border border-border bg-background shadow-lg lg:grid-cols-12">
						{/* Contact Methods */}
						<div className="border-border border-b bg-muted/20 p-8 md:p-12 lg:col-span-5 lg:border-r lg:border-b-0">
							<h3 className="mb-8 font-bold font-serif text-2xl">
								Direct Lines
							</h3>
							<div className="space-y-6">
								{[
									{
										icon: Mail,
										title: "Email Engineering",
										description: "hello@kaamsync.com",
										href: "mailto:hello@kaamsync.com",
									},
									{
										icon: MessageSquare,
										title: "Priority Support",
										description: "Average response: < 2 hours",
										href: "#",
									},
								].map(({ icon: Icon, title, description, href }) => (
									<a
										key={title}
										href={href}
										className="group flex items-start gap-4 border border-transparent p-4 transition-colors hover:border-border hover:bg-background"
									>
										<div className="flex size-10 shrink-0 items-center justify-center bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-foreground">
											<Icon className="size-5" />
										</div>
										<div>
											<h3 className="mb-1 font-medium font-mono text-xs uppercase tracking-wide">
												{title}
											</h3>
											<p className="font-medium text-foreground text-sm">
												{description}
											</p>
										</div>
									</a>
								))}

								<div className="mt-12 border border-border bg-background p-6">
									<h3 className="mb-2 font-bold text-sm">System Status</h3>
									<div className="flex items-center gap-2">
										<span className="relative flex size-2">
											<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
											<span className="relative inline-flex size-2 rounded-full bg-green-500" />
										</span>
										<span className="font-mono text-muted-foreground text-xs">
											All Systems Operational
										</span>
									</div>
								</div>
							</div>
						</div>

						{/* Contact Form */}
						<div className="bg-background p-8 md:p-12 lg:col-span-7">
							<h2 className="mb-8 font-bold font-serif text-2xl">
								Start a conversation
							</h2>
							<form className="space-y-6">
								<div className="grid gap-6 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="firstName">First Name</Label>
										<Input
											id="firstName"
											placeholder="Jane"
											className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lastName">Last Name</Label>
										<Input
											id="lastName"
											placeholder="Doe"
											className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Work Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="jane@company.com"
										className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="company">Company Name</Label>
									<Input
										id="company"
										placeholder="Acme Inc."
										className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="message">Project Details</Label>
									<Textarea
										id="message"
										placeholder="Tell us about the scale of your operations..."
										className="min-h-[150px] resize-none rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
									/>
								</div>
								<Button size="lg" className="w-full rounded-none font-bold">
									Send Message
								</Button>
							</form>
						</div>
					</div>
				</div>
			</section>

			{/* Enterprise CTA */}
			<section className="border-border/40 border-t bg-muted/20 py-24">
				<div className="container mx-auto px-4 text-center md:px-6">
					<h2 className="mb-6 font-bold text-3xl">Need Enterprise Support?</h2>
					<p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
						For custom integrations, SLA guarantees, and dedicated support
						channels.
					</p>
					<Button size="lg" variant="outline" className="h-12 px-8" asChild>
						<Link to="/contact">Contact Enterprise Sales</Link>
					</Button>
				</div>
			</section>
		</>
	);
}
