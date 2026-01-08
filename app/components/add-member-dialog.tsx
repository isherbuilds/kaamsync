import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";

interface AddMemberDialogProps {
	organizationId: string;
	currentMembers: number;
	planLimit: number;
	plan: string;
	children: React.ReactNode;
}

export function AddMemberDialog({
	organizationId,
	currentMembers,
	planLimit,
	plan,
	children,
}: AddMemberDialogProps) {
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const fetcher = useFetcher();

	const isLoading = fetcher.state === "submitting";
	const isOverLimit = currentMembers >= planLimit && plan !== "enterprise";
	const requiresPayment = isOverLimit;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			toast.error("Please enter a valid email address");
			return;
		}

		fetcher.submit(
			{
				email: email.trim(),
				organizationId,
			},
			{
				method: "POST",
				action: "/api/members/add-with-payment",
				encType: "application/json",
			},
		);
	};

	useEffect(() => {
		if (!isLoading && fetcher.data) {
			const data = fetcher.data as {
				success: boolean;
				requiresPayment?: boolean;
				paymentUrl?: string;
				member?: { email: string };
				error?: string;
			};

			if (data.success && data.requiresPayment && data.paymentUrl) {
				window.location.href = data.paymentUrl;
				return;
			}

			if (data.success && data.member) {
				toast.success(`${data.member.email} has been invited to your team!`);
				setOpen(false);
				setEmail("");
			}

			if (data.error) {
				toast.error(data.error);
			}
		}
	}, [fetcher.data, isLoading]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Team Member</DialogTitle>
					<DialogDescription>
						Invite a new member to join your team.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							placeholder="colleague@company.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isLoading}
							required
						/>
					</div>

					{/* Billing information */}
					<div className="rounded-lg bg-muted/50 p-3">
						<div className="text-sm">
							{plan === "enterprise" ? (
								<p className="text-muted-foreground">
									✅ Unlimited members included in your Enterprise plan
								</p>
							) : requiresPayment ? (
								<div className="space-y-1">
									<p className="font-medium text-orange-600">
										💳 Adding this member will cost $5
									</p>
									<p className="text-muted-foreground text-xs">
										You're at {currentMembers}/{planLimit} members included in
										your {plan} plan
									</p>
								</div>
							) : (
								<div className="space-y-1">
									<p className="font-medium text-green-600">
										✅ This member is included in your plan
									</p>
									<p className="text-muted-foreground text-xs">
										{currentMembers + 1}/{planLimit} members used
									</p>
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isLoading || !email.trim()}>
							{isLoading ? (
								<>
									<Spinner className="mr-2 size-4" />
									Processing...
								</>
							) : requiresPayment ? (
								"Pay $5 & Add Member"
							) : (
								"Add Member"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
