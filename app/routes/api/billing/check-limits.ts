import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import { requireSession } from "~/lib/auth/auth-helper";
import { checkPlanLimits } from "~/lib/billing/billing.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const { session } = await requireSession(request);
	const organizationId = session.activeOrganizationId;

	if (!organizationId) {
		return data({ error: "No active organization" }, { status: 400 });
	}

	const limitCheck = await checkPlanLimits(organizationId);

	return data({
		withinLimits: limitCheck.withinLimits,
		usage: limitCheck.usage,
		effectivePlan: limitCheck.effectivePlan,
		limits: limitCheck.limits,
		violations: limitCheck.violations,
	});
}
