import type { CheckoutOptions, PaymentProvider } from "../types";

export class ManualProvider implements PaymentProvider {
	name = "manual";

	async createCheckoutUrl(options: CheckoutOptions): Promise<string> {
		console.warn(
			"ManualProvider: createCheckoutUrl called. This should be handled manually via admin panel.",
		);
		return options.successUrl;
	}

	async cancelSubscription(subscriptionId: string): Promise<void> {
		console.log(
			`ManualProvider: Subscription ${subscriptionId} cancelled manually.`,
		);
	}
}
