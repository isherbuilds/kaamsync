/**
 * Auth Module - Unified authentication, authorization, and session management
 *
 * Structure:
 * - server.ts: Server-side auth configuration and setup
 * - client.ts: Client-side auth client and types
 * - offline-session.ts: Offline session caching and management
 * - access-control.ts: Access control definitions and roles
 * - types.ts: Shared auth types (if needed)
 */

// Access control
export { ac, admin, guest, member, owner, roles } from "./access-control";
// Client exports (only available in client context)
export { authClient, logout } from "./client";
export { dodoPayments } from "./dodo";
// Offline session management (can be used in both contexts)
export {
	clearAuthSessionFromLocalStorage,
	getAuthSessionFromLocalStorage,
	getAuthSessionSWR,
	saveAuthSessionToLocalStorage,
} from "./offline-session";
// Server exports (only available in server context)
export {
	type AuthServerSession,
	auth,
	getServerSession,
	type Session,
} from "./server";
export type { AuthSession } from "./types";
