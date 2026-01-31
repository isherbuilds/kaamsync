import { useZero } from "@rocicorp/zero/react";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import { toast } from "sonner";
import { mutators } from "zero/mutators";
import { Button } from "~/components/ui/button";

// --- Types ---

interface MatterApprovalSectionProps {
	isVisible: boolean;
	isAdmin: boolean;
	matterId: string;
	statusType?: string | null;
}

// --- Component ---

export function AdminApproveSection({
	isVisible,
	isAdmin,
	matterId,
	statusType,
}: MatterApprovalSectionProps) {
	const z = useZero();

	// --- Early Return ---
	if (!isVisible || !isAdmin) return null;

	// --- Handlers ---

	const handleApproveRequest = () => {
		z.mutate(mutators.matter.approve({ id: matterId }))
			.server.then(() => toast.success("Request approved"))
			.catch(() => toast.error("Failed to approve request"));
	};

	const handleRejectRequest = () => {
		z.mutate(mutators.matter.reject({ id: matterId }))
			.server.then(() => toast.success("Request rejected"))
			.catch(() => toast.error("Failed to reject request"));
	};

	// --- Rejected State ---

	if (statusType === "rejected") {
		return (
			<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
				<div className="v-stack items-start justify-between gap-4 sm:flex-row sm:items-center">
					<div className="space-y-1">
						<h3 className="font-bold text-destructive text-sm">
							Request Rejected
						</h3>
						<p className="text-destructive/70 text-xs">
							This request was rejected. You can still approve it if needed.
						</p>
					</div>
					<Button
						onClick={handleApproveRequest}
						size="sm"
						className="w-full bg-status-approved text-white hover:bg-status-approved/90 sm:w-auto"
					>
						<CheckCircle2 className="mr-2 size-4" /> Approve Anyway
					</Button>
				</div>
			</div>
		);
	}

	// --- Pending State ---

	return (
		<div className="rounded-lg border border-status-pending/20 bg-status-pending/10 p-4">
			<div className="v-stack items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="space-y-1">
					<h3 className="font-bold text-sm text-status-pending">
						Pending Approval
					</h3>
					<p className="text-status-pending/70 text-xs">
						Review this request to convert it into an active task.
					</p>
				</div>
				<div className="flex w-full gap-2 sm:w-auto">
					<Button
						onClick={handleRejectRequest}
						size="sm"
						variant="outline"
						className="flex-1 border-status-rejected/30 text-status-rejected hover:bg-status-rejected/5 sm:flex-none"
					>
						Reject
					</Button>
					<Button
						onClick={handleApproveRequest}
						size="sm"
						className="flex-1 bg-status-approved text-white hover:bg-status-approved/90 sm:flex-none"
					>
						<CheckCircle2 className="mr-2 size-4" /> Approve
					</Button>
				</div>
			</div>
		</div>
	);
}
