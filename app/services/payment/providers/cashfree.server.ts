import type { CheckoutOptions, PaymentProvider } from "../types";

export class CashfreeProvider implements PaymentProvider {
	name = "cashfree";

	async createCheckoutUrl(_options: CheckoutOptions): Promise<string> {
		throw new Error("Cashfree integration not implemented yet");
	}

	async cancelSubscription(_subscriptionId: string): Promise<void> {
		throw new Error("Cashfree integration not implemented yet");
	}
}
