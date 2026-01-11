export interface WebhookPayload {
	business_id: string;
	type?: string; // Better Auth uses 'type'
	event_type?: string; // Direct webhook uses 'event_type'
	timestamp: string | Date;
	data: {
		payload_type?: string;
		subscription_id?: string | null;
		payment_id?: string | null;
		customer_id?: string | null;
		customer?: {
			customer_id: string;
			email: string;
			name?: string;
		} | null;
		metadata?: {
			organizationId?: string;
			[key: string]: unknown;
		} | null;
		product_id?: string | null;
		status?: string | null;
		recurring_pre_tax_amount?: number | null;
		currency?: string | null;
		payment_frequency_interval?: string | null;
		created_at?: string | null;
		next_billing_date?: string | null;
		cancelled_at?: string | null;
		total_amount?: number | null;
		// Allow additional fields
		[key: string]: unknown;
	};
}

export interface PlanUsage {
	members: number;
	teams: number;
	matters: number;
	// storageGb: number; // Add when file storage is implemented
}
