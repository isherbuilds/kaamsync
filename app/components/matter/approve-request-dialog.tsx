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

interface ApproveRequestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	requestId: string;
	requestTitle: string;
	canApprove: boolean; // Security: only show dialog if user has permission
	onApprove?: (note?: string) => Promise<void>;
	onReject?: (note?: string) => Promise<void>;
}

export function ApproveRequestDialog({
	open,
	onOpenChange,
	requestId,
	requestTitle,
	canApprove,
	onApprove,
	onReject,
}: ApproveRequestDialogProps) {
	const z = useZero();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [note, setNote] = useState("");

	async function handleApprove() {
		setLoading(true);
		setError(null);
		try {
			await z.mutate(
				mutators.matter.approve({
					id: requestId,
					note: note || undefined,
				}),
			);

			toast.success("Request approved successfully");
			onApprove?.(note || undefined);
			setNote("");
			onOpenChange(false);
		} catch (e: unknown) {
			const errorMessage =
				e instanceof Error ? e.message : "Failed to approve request";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	async function handleReject() {
		setLoading(true);
		setError(null);
		try {
			await z.mutate(
				mutators.matter.reject({
					id: requestId,
					note: note || undefined,
				}),
			);

			toast.success("Request rejected");
			onReject?.(note || undefined);
			setNote("");
			onOpenChange(false);
		} catch (e: unknown) {
			const errorMessage =
				e instanceof Error ? e.message : "Failed to reject request";
			setError(errorMessage);
			toast.error(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	// Security: Don't render if user doesn't have permission
	if (!canApprove) {
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
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setNote(e.target.value)
							}
							disabled={loading}
							rows={3}
						/>
					</div>
					{error && <div className="text-red-500 text-sm">{error}</div>}
				</div>
				<DialogFooter className="flex flex-col gap-2 sm:flex-row">
					<Button
						onClick={handleApprove}
						disabled={loading}
						className="w-full"
						variant="default"
					>
						{loading ? "Approving..." : "Approve"}
					</Button>
					<Button
						onClick={handleReject}
						disabled={loading}
						className="w-full"
						variant="destructive"
					>
						{loading ? "Rejecting..." : "Reject"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
