import Check from "lucide-react/dist/esm/icons/check";
import Mail from "lucide-react/dist/esm/icons/mail";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { MarketingCTA } from "~/components/marketing/cta-section";
import {
	MarketingBadge,
	MarketingContainer,
	MarketingHeading,
} from "~/components/marketing/marketing-layout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { marketingMeta } from "~/lib/seo/marketing-meta";
import { createContactPageSchema } from "~/lib/seo/schemas";

export const meta: MetaFunction = () =>
	marketingMeta({
		title: "Contact KaamSync | Questions & Enterprise",
		description:
			"Real humans reply within 2 hours. No sales pressure, just honest answers.",
		path: "/contact",
		twitterDescription: "Enterprise sales and support inquiries",
	});

const structuredData = JSON.stringify(createContactPageSchema());

export default function ContactPage() {
	return (
		<>
			<script type="application/ld+json">{structuredData}</script>

			<MarketingContainer variant="hero" className="border-border/40 border-b">
				<div className="mx-auto max-w-3xl text-center">
					<MarketingBadge>We're Here</MarketingBadge>
					<MarketingHeading as="h2">
						Questions?
						<br />
						<span className="italic">Talk to a real person.</span>
					</MarketingHeading>
					<p className="mx-auto max-w-xl text-lg text-muted-foreground">
						Not sure if KaamSync fits your workflow? Wondering how to migrate
						from scattered messages? We're listening. Under 2 hours.
					</p>
				</div>

				<div className="mx-auto grid max-w-6xl gap-0 overflow-hidden border border-border bg-background shadow-lg lg:grid-cols-12">
					<div className="border-border border-b bg-muted/20 p-8 md:p-12 lg:col-span-5 lg:border-r lg:border-b-0">
						<MarketingHeading as="h3" className="mb-8 font-bold">
							Direct Lines
						</MarketingHeading>
						<div className="space-y-6">
							{[
								{
									icon: Mail,
									title: "Email",
									description: "hello@kaamsync.com",
									href: "mailto:hello@kaamsync.com",
								},
								{
									icon: MessageSquare,
									title: "Response Time",
									description: "Under 2 hours",
								},
							].map(({ icon: Icon, title, description, href }) =>
								href ? (
									<a
										key={title}
										href={href}
										className="group flex items-start gap-4 border border-transparent p-4 transition-colors hover:border-border hover:bg-background"
									>
										<div className="center flex size-10 shrink-0 bg-background text-muted-foreground shadow-sm transition-colors group-hover:text-foreground">
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
								) : (
									<div
										key={title}
										className="group flex items-start gap-4 border border-transparent p-4"
									>
										<div className="center flex size-10 shrink-0 bg-background text-muted-foreground shadow-sm">
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
									</div>
								),
							)}

							<div className="mt-12 border border-border bg-background p-6">
								<h3 className="mb-2 font-bold text-sm">Status</h3>
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

					<div className="bg-background p-8 md:p-12 lg:col-span-7">
						<MarketingHeading as="h3" className="mb-4 font-bold">
							Tell us what you're dealing with
						</MarketingHeading>

						<div className="mb-8 rounded-sm border border-primary/10 bg-primary/10 p-4">
							<h4 className="mb-2 font-medium text-sm">What happens next:</h4>
							<ul className="space-y-2 text-muted-foreground text-sm">
								<li className="flex items-center gap-2">
									<Check className="size-4 shrink-0 text-primary" />
									<span>A real human reads your message</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="size-4 shrink-0 text-primary" />
									<span>Reply within 2 hours</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="size-4 shrink-0 text-primary" />
									<span>No sales pressure—just help</span>
								</li>
							</ul>
						</div>

						<form className="space-y-6">
							<div className="grid gap-6 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="firstName">First name</Label>
									<Input
										id="firstName"
										placeholder="Jane"
										className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lastName">Last name</Label>
									<Input
										id="lastName"
										placeholder="Doe"
										className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="jane@company.com"
									className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="company">Company</Label>
								<Input
									id="company"
									placeholder="Acme Inc."
									className="h-11 rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="message">
									What's your coordination headache?
								</Label>
								<Textarea
									id="message"
									placeholder="How are you managing requests now? The more we understand, the better we can help."
									className="min-h-[120px] resize-none rounded-none border-border bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary"
								/>
							</div>
							<Button size="lg" className="w-full rounded-none font-bold">
								Send Message — Reply in 2 Hours
							</Button>

							<p className="mt-4 text-center text-muted-foreground text-xs">
								No spam. Just a direct answer.
							</p>
						</form>
					</div>
				</div>
			</MarketingContainer>

			<MarketingCTA
				title={
					<MarketingHeading as="h2" className="mb-8 leading-tight">
						Complex operation? <br /> Let's talk custom.
					</MarketingHeading>
				}
				description="Need specific integrations or custom workflows? We build enterprise solutions that match how you actually work."
				action={
					<Button
						size="lg"
						className="mx-auto h-14 w-fit bg-primary px-10 font-bold text-lg text-white hover:bg-primary/90"
						asChild
					>
						<Link to="/contact">Discuss Your Needs</Link>
					</Button>
				}
			/>
		</>
	);
}
