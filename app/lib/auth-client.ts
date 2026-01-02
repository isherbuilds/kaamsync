import { dodopaymentsClient } from "@dodopayments/better-auth";
import {
	// lastLoginMethodClient,
	organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "./auth-ac";
import { clearAuthSessionFromLocalStorage } from "./offline-auth";

export const authClient = createAuthClient({
	plugins: [
		organizationClient({
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
