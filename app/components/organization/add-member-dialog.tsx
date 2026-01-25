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

/* ---------------------------------- Types --------------------------------- */

interface AddMemberResponse {
	success: boolean;
	requiresPayment?: boolean;
	paymentUrl?: string;
	member?: { email: string };
	error?: string;
}

interface AddMemberDialogProps {
	organizationId: string;
	currentMemberCount: number;
	memberLimit: number;
	planType: string;
	children: React.ReactNode;
}

/* -------------------------------- Component ------------------------------- */

export function AddMemberDialog({
	organizationId,
	currentMemberCount,
	memberLimit,
	planType,
	children,
}: AddMemberDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [email, setEmail] = useState("");
	const fetcher = useFetcher();

	const isSubmitting = fetcher.state === "submitting";
	const isOverLimit = currentMemberCount >= memberLimit && planType !== "enterprise";
	const requiresPayment = isOverLimit;

	/* -------------------------------- Handlers -------------------------------- */

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEmail(e.target.value);
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
	};

	const handleCancel = () => {
		setIsOpen(false);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}

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

	const handleResetForm = () => {
		setIsOpen(false);
		setEmail("");
	};

	/* --------------------------------- Effects -------------------------------- */

	useEffect(() => {
		if (!isSubmitting && fetcher.data) {
			const data = fetcher.data as AddMemberResponse;

			if (data.success && data.requiresPayment && data.paymentUrl) {
				window.location.href = data.paymentUrl;
				return;
			}

			if (data.success && data.member) {
				toast.success(`${data.member.email} has been invited to your team!`);
				handleResetForm();
			}

			if (data.error) {
				toast.error(data.error);
			}
		}
	}, [fetcher.data, isSubmitting]);

	/* --------------------------------- Render --------------------------------- */

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
							onChange={handleEmailChange}
							disabled={isSubmitting}
							required
						/>
					</div>

					{/* Billing Information */}
					<div className="rounded-lg bg-muted/50 p-3">
						<div className="text-sm">
							{planType === "enterprise" ? (
								<p className="text-muted-foreground">
									✅ Unlimited members included in your Enterprise plan
								</p>
							) : requiresPayment ? (
								<div className="space-y-1">
									<p className="font-medium text-orange-600">
										💳 Adding this member will cost $5
									</p>
									<p className="text-muted-foreground text-xs">
										You're at {currentMemberCount}/{memberLimit} members included in
										your {planType} plan
									</p>
								</div>
							) : (
								<div className="space-y-1">
									<p className="font-medium text-green-600">
										✅ This member is included in your plan
									</p>
									<p className="text-muted-foreground text-xs">
										{currentMemberCount + 1}/{memberLimit} members used
									</p>
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !email.trim()}>
							{isSubmitting ? (
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
