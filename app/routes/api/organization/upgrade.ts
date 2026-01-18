import { eq } from "drizzle-orm";
import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema";
import { requireSession } from "~/lib/auth/auth-helper";
import { checkPlanLimits } from "~/lib/billing/billing.server";
import { getAccurateUsage } from "~/lib/billing/usage-counting.server";
import { logger } from "~/lib/logging/logger";

export async function action({ request }: ActionFunctionArgs) {
	const { session, user } = await requireSession(request);
	const organizationId = session.activeOrganizationId;

	if (!organizationId) {
		return data({ error: "No active organization" }, { status: 400 });
	}

	const body = await request.json();
	const { planKey, reason } = body;

	// Validate planKey
	if (!["starter", "growth", "pro", "enterprise"].includes(planKey)) {
		return data({ error: "Invalid plan" }, { status: 400 });
	}

	try {
		const usage = await getAccurateUsage(organizationId);
		const limitCheck = await checkPlanLimits(organizationId, planKey);

		const warnings: string[] = [];

		if (!limitCheck.withinLimits) {
			warnings.push("Current usage exceeds plan limits");
		}

		await db
			.update(organizationsTable)
			.set({
				planKey,
				planValidUntil: null,
			})
			.where(eq(organizationsTable.id, organizationId));

		logger.info(`[Billing] Plan upgraded for org ${organizationId}`, {
			userId: user.id,
			planKey,
			previousPlan: limitCheck.effectivePlan,
			reason,
			usage: {
				members: usage.members,
				teams: usage.teams,
				matters: usage.matters,
				storageGb: usage.storageGb,
			},
		});

		return data({
			success: true,
			plan: planKey,
			previousPlan: limitCheck.effectivePlan,
			warnings,
			usage: {
				members: usage.members,
				teams: usage.teams,
				matters: usage.matters,
				storageGb: usage.storageGb,
			},
		});
	} catch (error) {
		logger.error("[Billing] Plan upgrade failed:", error);
		return data(
			{ error: error instanceof Error ? error.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
