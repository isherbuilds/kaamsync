import { z } from "zod";

export const billingActionSchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.literal("checkout"),
		plan: z.enum(["growth", "pro"]),
		interval: z.enum(["monthly", "yearly"]),
	}),
	z.object({
		intent: z.literal("portal"),
	}),
]);

export type BillingActionInput = z.infer<typeof billingActionSchema>;
