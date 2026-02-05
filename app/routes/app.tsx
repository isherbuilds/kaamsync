import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { getLastOrgSlug, isOffline } from "~/lib/auth/offline";

export async function clientLoader() {
	const lastSlug = getLastOrgSlug();

	if (lastSlug) {
		return redirect(`/${lastSlug}/tasks`);
	}

	if (isOffline()) {
		return redirect("/login");
	}

	const session = await authClient.getSession();
	if (!session?.data) return redirect("/login");

	const { data: orgs } = await authClient.organization.list();
	if (orgs?.[0]) {
		const firstOrg = orgs[0];
		await authClient.organization.setActive({ organizationId: firstOrg.id });
		return redirect(`/${firstOrg.slug}/tasks`);
	}

	return redirect("/join");
}

clientLoader.hydrate = true as const;

export default function AppDispatcher() {
	return null;
}
