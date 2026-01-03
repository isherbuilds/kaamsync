import DodoPayments from "dodopayments";
import { env } from "~/lib/env";

export const dodoPayments = new DodoPayments({
	bearerToken: env.DODO_PAYMENTS_API_KEY,
	environment: env.isProduction ? "live_mode" : "test_mode",
});
