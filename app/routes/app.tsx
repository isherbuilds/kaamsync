import { redirect } from "react-router";
import { type AuthSession, authClient } from "~/lib/auth/client";
import { getAuthSession, isOffline, saveAuthSession } from "~/lib/auth/offline";

function getActiveOrganizationSlug(session: AuthSession | null) {
	return (
		(session?.session as { activeOrganizationSlug?: string | null } | undefined)
			?.activeOrganizationSlug ?? null
	);
}

export async function clientLoader() {
	let authSession = getAuthSession();

	const cachedSlug = getActiveOrganizationSlug(authSession);
	if (cachedSlug) {
		return redirect(`/${cachedSlug}/tasks`);
	}

	if (!authSession?.session) {
		if (isOffline()) {
			return redirect("/login");
		}

		const { data, error } = await authClient.getSession();
		if (error || !data?.session) {
			return redirect("/login");
		}
		authSession = data;
		saveAuthSession(authSession);
	}

	const sessionSlug = getActiveOrganizationSlug(authSession);
	if (sessionSlug) {
		return redirect(`/${sessionSlug}/tasks`);
	}

	try {
		const { data: orgs } = await authClient.organization.list();
		if (orgs?.[0]) {
			const firstOrg = orgs[0];
			await authClient.organization.setActive({ organizationId: firstOrg.id });

			const { data: updatedSession } = await authClient.getSession();
			if (updatedSession) {
				saveAuthSession(updatedSession);
			}

			return redirect(`/${firstOrg.slug}/tasks`);
		}
	} catch (error) {
		if (!isOffline()) {
			throw error;
		}
	}

	return redirect("/join");
}

clientLoader.hydrate = true as const;

export default function AppDispatcher() {
	return null;
}
