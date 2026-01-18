export interface CheckoutOptions {
	planId: string;
	orgId: string;
	successUrl: string;
	cancelUrl: string;
	customerEmail?: string;
}

export interface WebhookEvent {
	id: string;
	type:
		| "subscription.created"
		| "subscription.updated"
		| "subscription.cancelled"
		| "payment.succeeded"
		| "payment.failed";
	payload: unknown;
}

export interface PaymentProvider {
	name: string;
	createCheckoutUrl(options: CheckoutOptions): Promise<string>;
	cancelSubscription(subscriptionId: string): Promise<void>;
}

export interface WebhookEvent {
	id: string;
	type:
		| "subscription.created"
		| "subscription.updated"
		| "subscription.cancelled"
		| "payment.succeeded"
		| "payment.failed";
	payload: unknown;
}

export interface PaymentProvider {
	name: string;
	createCheckoutUrl(options: CheckoutOptions): Promise<string>;
	cancelSubscription(subscriptionId: string): Promise<void>;
	// verifyWebhook(request: Request): Promise<WebhookEvent>;
}
