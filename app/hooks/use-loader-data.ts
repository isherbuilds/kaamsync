import { unstable_useRoute as useRoute } from "react-router";

/**
 * Retrieves the loader data from the organization layout route.
 * Must be used within a component rendered inside an organization route.
 *
 * @throws Error if called outside of an organization route context
 * @returns The loader data from the organization layout route
 */
export function useOrganizationLoaderData() {
	const organizationLayoutRoute = useRoute("routes/organization/layout");

	if (!organizationLayoutRoute?.loaderData) {
		throw new Error(
			"useOrganizationLoaderData must be used within an organization route",
		);
	}

	return organizationLayoutRoute.loaderData;
}
