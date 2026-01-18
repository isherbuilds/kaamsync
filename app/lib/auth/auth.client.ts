import { dodopaymentsClient } from "@dodopayments/better-auth";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clearAuthSessionFromLocalStorage } from "./offline-auth";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
	plugins: [
		organizationClient(),
		adminClient({
			ac,
			roles,
		}),
		dodopaymentsClient(),
	],
});

export type AuthSession = typeof authClient.$Infer.Session;

export function logout() {
	authClient.signOut();
	// Clear cached session on logout
	clearAuthSessionFromLocalStorage();
}
