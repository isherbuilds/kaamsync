import { useZero } from "@rocicorp/zero/react";
import { useState } from "react";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ReviewRequestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	requestId: string;
	requestTitle: string;
	hasApprovalPermission: boolean;
	onApproveSuccess?: (note?: string) => Promise<void>;
	onRejectSuccess?: (note?: string) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ReviewRequestDialog({
	open,
	onOpenChange,
	requestId,
	requestTitle,
	hasApprovalPermission,
	onApproveSuccess,
	onRejectSuccess,
}: ReviewRequestDialogProps) {
	const z = useZero();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [note, setNote] = useState("");

	// ---------------------------------------------------------------------------
	// Handlers
	// ---------------------------------------------------------------------------

	const handleApprove = async () => {
		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await z.mutate(
				mutators.matter.approve({
					id: requestId,
					note: note || undefined,
				}),
			);

			toast.success("Request approved successfully");
			onApproveSuccess?.(note || undefined);
			setNote("");
			onOpenChange(false);
		} catch (e: unknown) {
			const message =
				e instanceof Error ? e.message : "Failed to approve request";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleReject = async () => {
		setIsSubmitting(true);
		setErrorMessage(null);
		try {
			await z.mutate(
				mutators.matter.reject({
					id: requestId,
					note: note || undefined,
				}),
			);

			toast.success("Request rejected");
			onRejectSuccess?.(note || undefined);
			setNote("");
			onOpenChange(false);
		} catch (e: unknown) {
			const message =
				e instanceof Error ? e.message : "Failed to reject request";
			setErrorMessage(message);
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setNote(e.target.value);
	};

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	if (!hasApprovalPermission) {
		return null;
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="mx-auto max-w-sm">
				<DialogHeader>
					<DialogTitle>Review Request</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<div className="mb-1 font-medium text-muted-foreground text-sm">
							Request
						</div>
						<div className="font-medium text-base">{requestTitle}</div>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="note" className="font-medium text-sm">
							Note (optional)
						</label>
						<Textarea
							id="note"
							placeholder="Add a note for this decision..."
							value={note}
							onChange={handleNoteChange}
							disabled={isSubmitting}
							rows={3}
						/>
					</div>
					{errorMessage && (
						<div className="text-red-500 text-sm">{errorMessage}</div>
					)}
				</div>
				<DialogFooter className="flex flex-col gap-2 sm:flex-row">
					<Button
						onClick={handleApprove}
						disabled={isSubmitting}
						className="w-full"
						variant="default"
					>
						{isSubmitting ? "Approving..." : "Approve"}
					</Button>
					<Button
						onClick={handleReject}
						disabled={isSubmitting}
						className="w-full"
						variant="destructive"
					>
						{isSubmitting ? "Rejecting..." : "Reject"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
