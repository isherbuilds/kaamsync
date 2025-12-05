import { unstable_useRoute as useRoute } from "react-router";

export function useOrgLoaderData() {
	const orgLayout = useRoute("routes/organization/layout");

	if (!orgLayout?.loaderData) {
		throw new Error("This must be used within an organization route");
	}

	const { loaderData } = orgLayout;

	return loaderData;
}
