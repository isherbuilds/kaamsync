import { redirect } from "react-router";
import { authClient } from "~/lib/auth/client";
import { isOffline } from "~/lib/auth/offline";

interface SessionWithOrgSlug {
	session: {
		activeOrganizationSlug?: string;
	};
}

export async function clientLoader() {
	const session = await authClient.getSession();

	const sessionData = session?.data as SessionWithOrgSlug | undefined;
	if (sessionData?.session?.activeOrganizationSlug) {
		return redirect(`/${sessionData.session.activeOrganizationSlug}/tasks`);
	}

	if (isOffline()) {
		return redirect("/login");
	}

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
