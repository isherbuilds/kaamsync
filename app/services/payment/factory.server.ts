import { CashfreeProvider } from "./providers/cashfree.server";
import { DodoProvider } from "./providers/dodo.server";
import { ManualProvider } from "./providers/manual.server";
import type { PaymentProvider } from "./types";

export class PaymentFactory {
	static getProvider(
		type: "dodo" | "cashfree" | "manual" | "stripe" | null,
	): PaymentProvider {
		const env =
			process.env.NODE_ENV === "production" ? "live_mode" : "test_mode";

		switch (type) {
			case "dodo":
				if (!process.env.DODO_PAYMENTS_API_KEY) {
					throw new Error("DODO_PAYMENTS_API_KEY is not set");
				}
				return new DodoProvider(process.env.DODO_PAYMENTS_API_KEY, env);
			case "cashfree":
				return new CashfreeProvider();
			default:
				return new ManualProvider();
		}
	}
}
