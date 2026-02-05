import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { getAuthSession, isOffline } from "~/lib/auth/offline";

export async function clientLoader() {
	const authSession = getAuthSession();

	if (authSession?.session.activeOrganizationSlug) {
		return redirect(`/${authSession.session.activeOrganizationSlug}/tasks`);
	}

	if (isOffline()) {
		return redirect("/login");
	}

	if (!authSession?.session) return redirect("/login");

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
