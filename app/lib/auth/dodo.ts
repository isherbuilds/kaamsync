import DodoPayments from "dodopayments";
import { getEnv } from "~/lib/env";

export const dodoPayments = new DodoPayments({
	bearerToken: getEnv("DODO_PAYMENTS_API_KEY") ?? "",
	environment: getEnv("NODE_ENV") === "production" ? "live_mode" : "test_mode",
});
