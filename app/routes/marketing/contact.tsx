import { Building2, Mail, MessageSquare } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

export const meta: MetaFunction = () => [
	{ title: "Contact - KaamSync" },
	{
		name: "description",
		content: "Get in touch with the KaamSync team. We'd love to hear from you.",
	},
];

const contactMethods = [
	{
		icon: Mail,
		title: "Email",
		description: "hello@kaamsync.com",
		href: "mailto:hello@kaamsync.com",
	},
	{
		icon: MessageSquare,
		title: "Live Chat",
		description: "Mon-Fri, 9am-6pm PST",
		href: "#",
	},
	{
		icon: Building2,
		title: "Office",
		description: "San Francisco, CA",
		href: "#",
	},
];

export default function ContactPage() {
	return (
		<>
			{/* Hero */}
			<section className="py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<p className="text-sm font-medium text-primary mb-4">Contact</p>
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
							Get in touch
						</h1>
						<p className="text-lg text-muted-foreground">
							Have a question or want to learn more? We'd love to hear from you.
						</p>
					</div>

					<div className="grid gap-12 lg:grid-cols-2 max-w-5xl mx-auto">
						{/* Contact Methods */}
						<div className="space-y-6">
							{contactMethods.map(
								({ icon: Icon, title, description, href }) => (
									<a
										key={title}
										href={href}
										className="flex gap-4 items-start p-6 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors"
									>
										<div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
											<Icon className="size-5 text-primary" />
										</div>
										<div>
											<h3 className="font-medium mb-1">{title}</h3>
											<p className="text-sm text-muted-foreground">
												{description}
											</p>
										</div>
									</a>
								),
							)}

							<div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-6">
								<h3 className="font-medium mb-2">Looking for support?</h3>
								<p className="text-sm text-muted-foreground mb-4">
									Check out our help center for quick answers to common
									questions.
								</p>
								<Button
									variant="outline"
									size="sm"
									className="rounded-lg border-border/60"
								>
									Visit Help Center
								</Button>
							</div>
						</div>

						{/* Contact Form */}
						<div className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm p-8">
							<h2 className="text-xl font-semibold mb-6">Send us a message</h2>
							<form className="space-y-5">
								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label htmlFor="firstName" className="text-sm">
											First name
										</Label>
										<Input
											id="firstName"
											placeholder="John"
											className="h-10 rounded-lg border-border/60 bg-background/50"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="lastName" className="text-sm">
											Last name
										</Label>
										<Input
											id="lastName"
											placeholder="Doe"
											className="h-10 rounded-lg border-border/60 bg-background/50"
										/>
									</div>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email" className="text-sm">
										Work email
									</Label>
									<Input
										id="email"
										type="email"
										placeholder="john@company.com"
										className="h-10 rounded-lg border-border/60 bg-background/50"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="company" className="text-sm">
										Company
									</Label>
									<Input
										id="company"
										placeholder="Acme Inc"
										className="h-10 rounded-lg border-border/60 bg-background/50"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="message" className="text-sm">
										Message
									</Label>
									<Textarea
										id="message"
										placeholder="Tell us how we can help..."
										className="min-h-[120px] rounded-lg border-border/60 bg-background/50 resize-none"
									/>
								</div>
								<Button
									type="submit"
									className="w-full h-10 rounded-lg bg-foreground text-background hover:bg-foreground/90"
								>
									Send Message
								</Button>
							</form>
						</div>
					</div>
				</div>
			</section>

			{/* Enterprise CTA */}
			<section className="py-24 md:py-32 border-t border-border/40">
				<div className="container mx-auto px-4 md:px-6">
					<div className="relative rounded-3xl border border-border/60 bg-card/30 backdrop-blur-sm p-12 md:p-16 text-center max-w-4xl mx-auto overflow-hidden">
						<div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
						<div className="relative">
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
								Enterprise needs?
							</h2>
							<p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
								For larger deployments, custom integrations, or security
								requirements, let's schedule a call.
							</p>
							<Button
								size="lg"
								className="h-11 px-8 rounded-lg bg-foreground text-background hover:bg-foreground/90"
								asChild
							>
								<Link to="/contact">Schedule a Demo</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>
		</>
	);
}
