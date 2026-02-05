import {
	inferAdditionalFields,
	organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clearAuthSession } from "./offline";
import type { auth } from "./server";

export const authClient = createAuthClient({
	plugins: [organizationClient(), inferAdditionalFields<typeof auth>()],
});

export type AuthSession = typeof authClient.$Infer.Session;

export function logout() {
	authClient.signOut();
	// Clear cached session on logout
	clearAuthSession();
}
