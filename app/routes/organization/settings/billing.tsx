import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema";
import { requireSession } from "~/lib/auth/auth-helper";
import { logger } from "~/lib/logging/logger";

export async function action({ request }: ActionFunctionArgs) {
	const body = await request.json();
	const { organizationId, planKey } = body as {
		organizationId: string;
		planKey: "starter" | "growth" | "pro" | "enterprise";
	};

	const validPlans = ["starter", "growth", "pro", "enterprise"];

	if (!validPlans.includes(planKey)) {
		return data({ error: "Invalid plan" }, { status: 400 });
	}

	const session = await requireSession(request);
	const { user } = session;
	const { id: userId } = user;

	try {
		await db
			.update(organizationsTable)
			.set({
				planKey,
				planValidUntil: null,
			})
			.where(eq(organizationsTable.id, organizationId));

		logger.info(
			`[Billing] Manual plan change by user ${userId} for org ${organizationId}`,
			{
				planKey,
			},
		);

		return data({ success: true, message: "Plan updated successfully" });
	} catch (error) {
		logger.error("[Billing] Manual plan change failed:", error);
		data(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
