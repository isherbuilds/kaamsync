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
					<div className="mx-auto mb-16 max-w-3xl text-center">
						<p className="mb-4 font-medium text-primary text-sm">Contact</p>
						<h1 className="mb-6 font-bold text-4xl tracking-tight md:text-5xl lg:text-6xl">
							Get in touch
						</h1>
						<p className="text-lg text-muted-foreground">
							Have a question or want to learn more? We'd love to hear from you.
						</p>
					</div>

					<div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-2">
						{/* Contact Methods */}
						<div className="space-y-6">
							{contactMethods.map(
								({ icon: Icon, title, description, href }) => (
									<a
										key={title}
										href={href}
										className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/30 p-6 backdrop-blur-sm transition-colors hover:bg-card/50"
									>
										<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
											<Icon className="size-5 text-primary" />
										</div>
										<div>
											<h3 className="mb-1 font-medium">{title}</h3>
											<p className="text-muted-foreground text-sm">
												{description}
											</p>
										</div>
									</a>
								),
							)}

							<div className="rounded-2xl border border-border/60 bg-card/30 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-medium">Looking for support?</h3>
								<p className="mb-4 text-muted-foreground text-sm">
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
						<div className="rounded-2xl border border-border/60 bg-card/30 p-8 backdrop-blur-sm">
							<h2 className="mb-6 font-semibold text-xl">Send us a message</h2>
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
										className="min-h-[120px] resize-none rounded-lg border-border/60 bg-background/50"
									/>
								</div>
								<Button
									type="submit"
									className="h-10 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
								>
									Send Message
								</Button>
							</form>
						</div>
					</div>
				</div>
			</section>

			{/* Enterprise CTA */}
			<section className="border-border/40 border-t py-24 md:py-32">
				<div className="container mx-auto px-4 md:px-6">
					<div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-border/60 bg-card/30 p-12 text-center backdrop-blur-sm md:p-16">
						<div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/5" />
						<div className="relative">
							<h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
								Enterprise needs?
							</h2>
							<p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
								For larger deployments, custom integrations, or security
								requirements, let's schedule a call.
							</p>
							<Button
								size="lg"
								className="h-11 rounded-lg bg-foreground px-8 text-background hover:bg-foreground/90"
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
