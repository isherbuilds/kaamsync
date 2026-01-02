import { eq } from "drizzle-orm";
import { redirect } from "react-router";
import { db } from "~/db";
import { organizationsTable } from "~/db/schema";
import { getServerSession } from "~/lib/auth";
import type { Route } from "./+types/callback";

/**
 * Dodo Payments success callback route.
 * Handles the redirect from Dodo Payments after a successful checkout.
 * Securely redirects the user to their dynamic organization billing page.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const success = url.searchParams.get("success");
	const subscriptionId = url.searchParams.get("subscription_id");

	// 1. Validate session
	const session = await getServerSession(request);
	if (!session) {
		console.log("No session found in billing callback, redirecting to login");
		throw redirect("/login");
	}

	const activeOrgId = session.session.activeOrganizationId;
	if (!activeOrgId) {
		console.log("No active organization found for user, redirecting to join");
		throw redirect("/join");
	}

	// 2. Get organization slug
	const org = await db.query.organizationsTable.findFirst({
		where: eq(organizationsTable.id, activeOrgId),
	});

	if (!org) {
		console.log(`Organization ${activeOrgId} not found, redirecting to join`);
		throw redirect("/join");
	}

	// 3. Security: Check if subscription_id matches (optional but recommended)
	// Note: During the first purchase, org.subscriptionId might not be updated yet
	// because the webhook might be processing in parallel.
	// We primarily rely on the session's activeOrganizationId for the redirect destination.

	console.log(`Redirecting user to organization: ${org.slug} (${activeOrgId})`);

	// 4. Build redirect URL
	// We preserve the success=true flag if it exists so the billing page can show a success message
	const redirectPath =
		success === "true"
			? `/${org.slug}/settings/billing?success=true`
			: `/${org.slug}/settings/billing`;

	if (subscriptionId) {
		// You can also append subscription_id if the billing page needs it
		const finalUrl = new URL(redirectPath, url.origin);
		finalUrl.searchParams.set("subscription_id", subscriptionId);
		throw redirect(finalUrl.pathname + finalUrl.search);
	}

	throw redirect(redirectPath);
}
