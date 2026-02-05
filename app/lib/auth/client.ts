import {
	// lastLoginMethodClient,
	organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clearAuthSession } from "./offline";

export const authClient = createAuthClient({
	plugins: [organizationClient()],
});

export type AuthSession = typeof authClient.$Infer.Session;

export function logout() {
	authClient.signOut();
	// Clear cached session on logout
	clearAuthSession();
}
