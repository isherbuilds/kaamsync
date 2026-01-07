import { data, type LoaderFunctionArgs } from "react-router";
import { getServerSession } from "~/lib/auth";
import { usagePricing } from "~/lib/billing";
import {
	canAddMember,
	canCreateTeam,
	getMemberCount,
} from "~/lib/server/billing.server";
import { getMemberPrice } from "~/lib/server/member-billing.server";

/**
 * API endpoint to check billing limits and get current usage
 * GET /api/billing/check-limits
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const session = await getServerSession(request);

	if (!session?.session?.activeOrganizationId) {
		return data({ error: "No active organization" }, { status: 401 });
	}

	const orgId = session.session.activeOrganizationId;

	const [memberCheck, teamCheck, memberCount] = await Promise.all([
		canAddMember(orgId),
		canCreateTeam(orgId),
		getMemberCount(orgId),
	]);

	// Determine overage prices for UI
	const plan = memberCount.plan as keyof typeof usagePricing | string;
	const teamPriceCents =
		(plan && (usagePricing as any)[plan]?.teamCreated) ?? null;
	const memberPriceCents = getMemberPrice(plan);

	return data({
		// Member information
		canAddMember: memberCheck.allowed,
		memberMessage: memberCheck.message,
		memberRequiresPayment: memberCheck.isOverage ?? false,
		currentMembers: memberCount.currentMembers,
		memberLimit: memberCount.planLimit,
		memberPriceCents,

		// Team information
		canCreateTeam: teamCheck.allowed,
		teamMessage: teamCheck.allowed ? null : teamCheck.reason,
		teamOverage: teamCheck.isOverage ?? false,
		teamPriceCents,

		// Plan information
		plan: memberCount.plan,
	});
}
