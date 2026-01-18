import { data, type LoaderFunctionArgs } from "react-router";
import { getServerSession } from "~/lib/auth/auth.server";
import { getBillingStatus } from "~/lib/billing/billing.server";

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
	const status = await getBillingStatus(orgId);

	return data({
		// Member information
		canAddMember: status.members.allowed,
		memberMessage: status.members.message,
		memberRequiresPayment: status.members.requiresPayment,
		currentMembers: status.members.current,
		memberLimit: status.members.limit,
		memberPriceCents: status.members.priceCents,

		// Team information
		canCreateTeam: status.teams.allowed,
		teamMessage: status.teams.message,
		teamOverage: status.teams.requiresPayment,
		teamPriceCents: status.teams.priceCents,

		// Matter information
		canCreateMatter: status.matters.allowed,
		matterMessage: status.matters.message,
		currentMatters: status.matters.current,
		matterLimit: status.matters.limit,
		matterRemaining: status.matters.remaining,

		// Plan information
		plan: status.plan,
	});
}
