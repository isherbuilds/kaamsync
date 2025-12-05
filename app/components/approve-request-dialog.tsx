import { useState } from "react";
import { toast } from "sonner";
import { useZ } from "~/hooks/use-zero-cache";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";

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
	const z = useZ();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [note, setNote] = useState("");

	async function handleApprove() {
		setLoading(true);
		setError(null);
		try {
			await z.mutate.matter.approve({
				id: requestId,
				note: note || undefined,
			});

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
			await z.mutate.matter.reject({
				id: requestId,
				note: note || undefined,
			});

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
			<DialogContent className="max-w-sm mx-auto">
				<DialogHeader>
					<DialogTitle>Review Request</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<div className="text-sm font-medium text-muted-foreground mb-1">
							Request
						</div>
						<div className="text-base font-medium">{requestTitle}</div>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="note" className="text-sm font-medium">
							Note (optional)
						</label>
						<Textarea
							id="note"
							placeholder="Add a note for this decision..."
							value={note}
							onChange={(e) => setNote(e.target.value)}
							disabled={loading}
							rows={3}
						/>
					</div>
					{error && <div className="text-red-500 text-sm">{error}</div>}
				</div>
				<DialogFooter className="flex flex-col sm:flex-row gap-2">
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
