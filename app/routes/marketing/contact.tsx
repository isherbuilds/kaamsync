import { Clock, Globe, Mail, MapPin, MessageSquare } from "lucide-react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
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
			<MarketingContainer>
				<div className="mx-auto mb-16 max-w-3xl text-center">
					<MarketingBadge>Support</MarketingBadge>
					<MarketingHeading as="h1" className="mb-6" italic="to your field.">
						Deploy KaamSync <br />
					</MarketingHeading>
					<p className="mx-auto max-w-xl text-lg text-muted-foreground">
						Setup takes 2 minutes. For enterprise deployments or custom
						integrations, talk to our engineering team.
					</p>
				</div>

				<div className="mx-auto grid max-w-6xl gap-0 overflow-hidden border border-border bg-background shadow-lg lg:grid-cols-12">
					{/* Contact Methods */}
					<div className="border-border border-b bg-muted/20 p-8 md:p-12 lg:col-span-5 lg:border-r lg:border-b-0">
						<MarketingHeading as="h3" className="mb-8 font-bold">
							Direct Lines
						</MarketingHeading>
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
						<MarketingHeading as="h3" className="mb-8 font-bold">
							Start a conversation
						</MarketingHeading>
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
								<Label htmlFor="message">Operation Scale / Matter Volume</Label>
								<Textarea
									id="message"
									placeholder="Tell us about your team size, site count, and average monthly Matters..."
									className="min-h-[150px] resize-none rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
								/>
							</div>
							<Button size="lg" className="w-full rounded-none font-bold">
								Send Message
							</Button>
						</form>
					</div>
				</div>
			</MarketingContainer>

			{/* BASE OF OPERATIONS */}
			<MarketingContainer className="bg-muted/30">
				<div className="mx-auto max-w-4xl">
					<div className="mb-16">
						<MarketingBadge>Presence</MarketingBadge>
						<MarketingHeading italic="operations.">Base of </MarketingHeading>
					</div>

					<div className="grid gap-12 md:grid-cols-3">
						{[
							{
								icon: MapPin,
								title: "Coordinates",
								line1: "Sector 18, Cyber Hub",
								line2: "Gurugram, HR 122002",
							},
							{
								icon: Clock,
								title: "Operational Hours",
								line1: "Mon — Fri: 08:00 - 20:00",
								line2: "Sat: 09:00 - 15:00",
							},
							{
								icon: Globe,
								title: "Regional Reach",
								line1: "Supporting 500+ sites",
								line2: "Across South East Asia",
							},
						].map((item) => (
							<div
								key={item.title}
								className="group flex flex-col items-start gap-4"
							>
								<div className="flex size-12 items-center justify-center rounded-none border border-border bg-background transition-colors group-hover:border-primary group-hover:bg-primary/5">
									<item.icon className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
								</div>
								<div>
									<h3 className="mb-2 font-bold font-mono text-xs uppercase tracking-widest">
										{item.title}
									</h3>
									<p className="font-medium text-foreground">{item.line1}</p>
									<p className="text-muted-foreground text-sm">{item.line2}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</MarketingContainer>

			{/* Enterprise CTA */}
			<section className="bg-foreground py-32 text-center text-background">
				<div className="container mx-auto px-4 md:px-6">
					<div className="mx-auto max-w-2xl">
						<MarketingHeading as="h2" className="mb-8 leading-tight">
							Scale your field ops <br /> with confidence.
						</MarketingHeading>
						<p className="mb-12 text-background/70 text-lg">
							For custom integrations, SLA guarantees, and dedicated support
							channels, our engineering team is here to help.
						</p>
						<Button
							size="lg"
							className="h-16 rounded-none bg-primary px-8 font-bold text-lg text-primary-foreground hover:bg-primary/90"
							asChild
						>
							<Link to="/contact">Request Enterprise Tour</Link>
						</Button>
					</div>
				</div>
			</section>
		</>
	);
}
