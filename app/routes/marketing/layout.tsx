import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, redirect } from "react-router";
// import { ColorSchemeToggle } from "~/components/layout/color-scheme-toggle";
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
		className="text-muted-foreground/80 text-sm transition-colors duration-200 hover:text-foreground"
	>
		{children}
	</Link>
);

export default function MarketingLayout() {
	const [open, setOpen] = useState(false);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="fixed inset-x-0 top-0 z-50">
				<nav className="flex items-center justify-between gap-4 border-border/40 border-b bg-background p-4 md:px-6">
					<div className="flex md:flex-1">
						<Link to="/" className="flex items-center gap-1">
							<div className="flex size-7 items-center justify-center bg-white">
								<img
									src="/static/kaamsync-logo.png"
									alt="KaamSync"
									className="size-6 invert"
								/>
							</div>
							<span className="font-bold text-lg tracking-tight">KaamSync</span>
						</Link>
					</div>

					{/* Desktop nav */}
					<div className="hidden md:flex md:gap-x-10">
						{navLinks.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
							>
								{label}
							</Link>
						))}
					</div>

					<div className="flex flex-1 items-center justify-end gap-4">
						<Link
							to="/login"
							className="font-medium text-muted-foreground text-sm transition-colors hover:text-primary"
						>
							Log In
						</Link>
						<Button
							asChild
							size="sm"
							className="h-8 rounded-md bg-primary px-4 font-bold text-primary-foreground text-xs hover:bg-primary/90"
						>
							<Link to="/signup">Sign Up</Link>
						</Button>
					</div>

					{/* Mobile menu button */}
					<div className="flex md:hidden">
						<button type="button" onClick={() => setOpen(!open)}>
							<span className="sr-only">Toggle menu</span>
							{open ? <X className="size-5" /> : <Menu className="size-5" />}
						</button>
					</div>
				</nav>

				{/* Mobile menu panel */}
				<div
					className={`fixed inset-0 z-40 bg-background transition-opacity duration-200 ease-in-out md:hidden ${
						open
							? "pointer-events-auto opacity-100"
							: "pointer-events-none opacity-0"
					}`}
					style={{ top: "60px" }} // Approximate header height offset to ensure it doesn't overlap weirdly if z-index fails, but mainly relying on padding
				>
					<div className="flex h-full w-full flex-col p-6">
						<div className="flex-1 overflow-y-auto">
							<div className="flex flex-col gap-4">
								{navLinks.map(({ to, label }) => (
									<Link
										key={to}
										to={to}
										onClick={() => setOpen(false)}
										className="text-2xl text-foreground transition-colors hover:bg-muted/50"
									>
										{label}
									</Link>
								))}
							</div>

							<div className="mt-8 space-y-4 border-border/40 border-t pt-8">
								<div className="grid grid-cols-2 gap-4">
									<Link
										to="/login"
										onClick={() => setOpen(false)}
										className="flex items-center justify-center rounded-xl bg-muted/50 px-3 py-3 font-medium text-base text-foreground transition-colors hover:bg-muted"
									>
										Log In
									</Link>
									<Link
										to="/signup"
										onClick={() => setOpen(false)}
										className="flex items-center justify-center rounded-xl bg-foreground px-3 py-3 font-medium text-background text-base transition-colors hover:bg-foreground/90"
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

			<footer className="mt-24 border-border/40 border-t">
				<div className="container mx-auto px-4 py-16 md:px-6">
					<div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
						<div className="space-y-4 lg:col-span-2">
							<Link to="/" className="flex items-center gap-2.5">
								<div className="flex size-7 items-center justify-center bg-white">
									<img
										src="/static/kaamsync-logo.png"
										alt="KaamSync"
										className="size-6 invert"
									/>
								</div>
								<span className="font-semibold">KaamSync</span>
							</Link>
							<p className="max-w-xs text-muted-foreground/80 text-sm leading-relaxed">
								The modern way for teams to manage tasks, approvals, and
								operations. Built for clarity.
							</p>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium text-sm">Product</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/pricing">Pricing</FooterLink>
								<FooterLink to="/about">About</FooterLink>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium text-sm">Resources</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/contact">Contact</FooterLink>
								<FooterLink to="/terms">Terms</FooterLink>
								<FooterLink to="/privacy">Privacy</FooterLink>
							</div>
						</div>
						<div className="space-y-4">
							<h4 className="font-medium text-sm">Connect</h4>
							<div className="flex flex-col gap-3">
								<FooterLink to="/twitter">Twitter</FooterLink>
								<FooterLink to="/linkedin">LinkedIn</FooterLink>
							</div>
						</div>
					</div>
					{/* <div className="mt-16 flex flex-col items-center justify-between gap-4 border-border/40 border-t pt-8 md:flex-row">
						<p className="text-muted-foreground/60 text-xs">
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
