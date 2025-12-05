import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, redirect } from "react-router";
import { ColorSchemeToggle } from "~/components/color-scheme-toggle.js";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

export async function clientLoader() {
	const session = await authClient.getSession();
	if (!session?.data) return null;
	const orgs = await authClient.organization.list();
	return orgs.data?.length
		? redirect(`/${orgs.data[0]?.slug}/tasks`)
		: redirect("/join");
}

const navLinks = [
	{ to: "/", label: "Home" },
	{ to: "/pricing", label: "Pricing" },
	{ to: "/about", label: "About" },
	{ to: "/contact", label: "Contact" },
] as const;

const FooterLink = ({
	to,
	children,
}: {
	to: string;
	children: React.ReactNode;
}) => (
	<Link
		to={to}
		className="text-sm text-muted-foreground/80 hover:text-foreground transition-colors duration-200"
	>
		{children}
	</Link>
);

export default function MarketingLayout() {
	const [open, setOpen] = useState(false);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="fixed inset-x-0 top-0 z-50">
				<nav className="flex items-center justify-between p-4 md:px-6 bg-background/60 gap-2 backdrop-blur-xl border-b border-border/40">
					<div className="flex md:flex-1">
						<Link to="/" className="-m-1.5 p-1.5 flex items-center gap-2.5">
							<div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
								<Zap className="size-4" />
							</div>
							<span className="font-semibold text-lg tracking-tight">
								KaamSync
							</span>
						</Link>
					</div>

					{/* Desktop nav */}
					<div className="hidden md:flex md:gap-x-10">
						{navLinks.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
							>
								{label}
							</Link>
						))}
					</div>

					<div className="flex flex-1 justify-end gap-2 md:gap-4 items-center">
						<Link
							to="/login"
							className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Log in
						</Link>
						<Button
							asChild
							size="sm"
							className="h-8 px-4 rounded-lg bg-foreground text-background hover:bg-foreground/90"
						>
							<Link to="/signup">Sign up</Link>
						</Button>
					</div>

					{/* Mobile menu button */}
					<div className="flex md:hidden">
						<button type="button" onClick={() => setOpen(!open)}>
							<span className="sr-only">Toggle menu</span>
							{open ? <X className="size-4" /> : <Menu className="size-4" />}
						</button>
					</div>
				</nav>

				{/* Mobile menu panel */}
				<div
					className={`fixed inset-0 z-40 bg-background md:hidden transition-opacity duration-200 ease-in-out ${
						open
							? "opacity-100 pointer-events-auto"
							: "opacity-0 pointer-events-none"
					}`}
					style={{ top: "60px" }} // Approximate header height offset to ensure it doesn't overlap weirdly if z-index fails, but mainly relying on padding
				>
					<div className="flex flex-col h-full w-full p-6">
						<div className="flex-1 overflow-y-auto">
							<div className="flex flex-col gap-4">
								{navLinks.map(({ to, label }) => (
									<Link
										key={to}
										to={to}
										onClick={() => setOpen(false)}
										className="text-2xl text-foreground hover:bg-muted/50 transition-colors"
									>
										{label}
									</Link>
								))}
							</div>

							<div className="mt-8 pt-8 border-t border-border/40 space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<Link
										to="/login"
										onClick={() => setOpen(false)}
										className="flex items-center justify-center rounded-xl px-3 py-3 text-base font-medium text-foreground bg-muted/50 hover:bg-muted transition-colors"
									>
										Log in
									</Link>
									<Link
										to="/signup"
										onClick={() => setOpen(false)}
										className="flex items-center justify-center rounded-xl px-3 py-3 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
									>
										Get Started
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>
			</header>

			<main className="py-14">
				<Outlet />
			</main>

			<footer className="border-t border-border/40 mt-24">
				<div className="container mx-auto px-4 md:px-6 py-16">
					<div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
						<div className="lg:col-span-2 space-y-4">
							<Link to="/" className="flex items-center gap-2.5">
								<div className="flex size-7 items-center justify-center rounded-md bg-linear-to-br from-primary/20 to-primary/10 text-primary">
									<Zap className="size-4" />
								</div>
								<span className="font-semibold">KaamSync</span>
							</Link>
							<p className="text-sm text-muted-foreground/80 max-w-xs leading-relaxed">
								The modern way for teams to manage tasks, approvals, and
								operations. Built for clarity.
							</p>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Product</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/pricing">Pricing</FooterLink>
								<FooterLink to="/about">About</FooterLink>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Resources</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/contact">Contact</FooterLink>
								<FooterLink to="/terms">Terms</FooterLink>
								<FooterLink to="/privacy">Privacy</FooterLink>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="text-sm font-medium">Connect</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/twitter">Twitter</FooterLink>
								<FooterLink to="/linkedin">LinkedIn</FooterLink>
							</div>
						</div>
					</div>
					{/* <div className="mt-16 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4">
						<p className="text-xs text-muted-foreground/60">
							© {new Date().getFullYear()} KaamSync. All rights reserved.
						</p>
						<ColorSchemeToggle />
						<div className="flex gap-6">
							<FooterLink to="/terms">Terms</FooterLink>
							<FooterLink to="/privacy">Privacy</FooterLink>
						</div>
					</div> */}
				</div>
			</footer>
		</div>
	);
}
