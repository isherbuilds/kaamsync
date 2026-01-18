import DodoPayments from "dodopayments";
import type { CheckoutOptions, PaymentProvider } from "../types";

export class DodoProvider implements PaymentProvider {
	name = "dodo";
	private client: DodoPayments;

	constructor(
		apiKey: string,
		environment: "live_mode" | "test_mode" = "test_mode",
	) {
		this.client = new DodoPayments({
			bearerToken: apiKey,
			environment,
		});
	}

	async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
		const session = await this.client.subscriptions.create({
			billing: {
				city: "New York",
				country: "US",
				state: "NY",
				street: "123 Main St",
				zipcode: "10001",
			},
			customer: {
				email: options.customerEmail || "",
				name: options.orgId,
			},
			product_id: options.planId,
			quantity: 1,
			return_url: options.successUrl,
		});

		return (session as any).payment_link ?? "";
	}

	async cancelSubscription(subscriptionId: string): Promise<void> {
		await (this.client.subscriptions as any).cancel(subscriptionId);
	}
}
