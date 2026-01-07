import { eq } from "drizzle-orm";
import { db } from "~/db";
import { membersTable, organizationsTable } from "~/db/schema";
import { planLimits } from "~/lib/billing";

/**
 * Get current member count and plan limit for an organization
 */
export async function getMemberCount(organizationId: string): Promise<{
	currentMembers: number;
	planLimit: number;
	plan: string;
}> {
	// Get organization with member count
	const [orgResult] = await db
		.select({
			plan: organizationsTable.plan,
			memberCount: organizationsTable.memberCount,
		})
		.from(organizationsTable)
		.where(eq(organizationsTable.id, organizationId))
		.limit(1);

	if (!orgResult) {
		throw new Error("Organization not found");
	}

	const plan = orgResult.plan || "starter";
	const currentMembers = orgResult.memberCount || 0;
	const planLimit = planLimits[plan as keyof typeof planLimits]?.members || 3;

	return {
		currentMembers,
		planLimit,
		plan,
	};
}

/**
 * Check if organization can add a member without payment
 */
export async function canAddMemberFree(organizationId: string): Promise<{
	allowed: boolean;
	requiresPayment: boolean;
	currentMembers: number;
	planLimit: number;
	plan: string;
}> {
	const { currentMembers, planLimit, plan } = await getMemberCount(
		organizationId,
	);

	// Enterprise has unlimited members
	if (plan === "enterprise") {
		return {
			allowed: true,
			requiresPayment: false,
			currentMembers,
			planLimit: -1,
			plan,
		};
	}

	const withinLimit = currentMembers < planLimit;

	return {
		allowed: true, // Always allowed, but may require payment
		requiresPayment: !withinLimit,
		currentMembers,
		planLimit,
		plan,
	};
}

/**
 * Get the member addition product slug for a plan
 */
export function getMemberProductSlug(plan: string): string {
	switch (plan) {
		case "starter":
			return "member-add-starter";
		case "growth":
			return "member-add-growth";
		case "pro":
			return "member-add-pro";
		case "enterprise":
			throw new Error("Enterprise plans don't require member payments");
		default:
			return "member-add-starter";
	}
}

/**
 * Get member addition price for a plan (in cents)
 */
export function getMemberPrice(plan: string): number {
	// All plans have the same member addition price: $5
	return 500;
}

/**
 * Record a member addition payment
 */
export async function recordMemberPayment(
	organizationId: string,
	email: string,
	paymentId: string,
	amount: number,
): Promise<void> {
	// This will be handled by the webhook system
	// Just log for now
	console.log(
		`[Billing] Member payment recorded: org=${organizationId}, email=${email}, payment=${paymentId}, amount=${amount}`,
	);
}