import { Badge } from "~/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";

interface Payment {
	id: string;
	amount: number;
	currency: string;
	status: string;
	createdAt: Date;
}

interface PaymentHistoryProps {
	payments: Payment[];
}

const statusVariant = {
	succeeded: "default" as const,
	failed: "destructive" as const,
	pending: "secondary" as const,
	processing: "secondary" as const,
	cancelled: "outline" as const,
};

function formatDate(date: Date): string {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

function formatAmount(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency ?? "USD",
	}).format(amount / 100);
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
	if (!payments.length) {
		return (
			<div className="rounded-md border p-8 text-center">
				<p className="text-muted-foreground text-sm">No payment history yet</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Date</TableHead>
						<TableHead>Amount</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{payments.map((payment) => (
						<TableRow key={payment.id}>
							<TableCell>{formatDate(payment.createdAt)}</TableCell>
							<TableCell className="font-medium">
								{formatAmount(payment.amount, payment.currency)}
							</TableCell>
							<TableCell>
								<Badge
									variant={
										statusVariant[
											payment.status as keyof typeof statusVariant
										] ?? "outline"
									}
								>
									{payment.status}
								</Badge>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
