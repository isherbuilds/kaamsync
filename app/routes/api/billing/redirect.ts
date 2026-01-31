import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getServerSession } from "~/lib/auth/server";
import { getOrganizationById } from "~/lib/organization/service";
import { safeError } from "~/lib/utils/logger";

/**
 * Billing redirect handler
 * After Dodo Payments checkout, redirects to the user's active organization billing page
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const success = url.searchParams.get("success");
	const cancelled = url.searchParams.get("cancelled");

	// Build query string for the final redirect
	const queryParams = new URLSearchParams();
	if (success === "true") {
		queryParams.set("success", "true");
	} else if (cancelled === "true") {
		queryParams.set("cancelled", "true");
	}
	const queryString = queryParams.toString();

	try {
		const session = await getServerSession(request);

		if (session?.session?.activeOrganizationId) {
			// Get the organization details to find the slug
			const org = await getOrganizationById(
				session.session.activeOrganizationId,
			);

			if (org?.slug) {
				const redirectUrl = `/${org.slug}/settings/billing${queryString ? `?${queryString}` : ""}`;
				return redirect(redirectUrl);
			}
		}

		// Fallback to home if no org - billing is organization-scoped
		return redirect(`/${queryString ? `?${queryString}` : ""}`);
	} catch (error) {
		safeError(error, "[Billing Redirect] Error");
		// Fallback on error - redirect to home
		return redirect(`/${queryString ? `?${queryString}` : ""}`);
	}
}
