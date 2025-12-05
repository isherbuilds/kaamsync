import { definePermissions, type Schema as ZeroSchema } from "@rocicorp/zero";
import { schema as genSchema } from "./schema.gen";

/**
 * Authentication context for Zero.
 * Follows zbugs pattern: minimal auth data, permission checks in mutators/queries.
 */
export type AuthData = {
	sub: string; // User ID
	activeOrganizationId: string | null; // Current organization context
};

export const schema = {
	...genSchema,
	enableLegacyMutators: false, // Use custom mutators only
	enableLegacyQueries: false, // Use synced queries only - enforces server-side permissions!
} as const satisfies ZeroSchema;

export type Schema = typeof schema;

export const permissions = definePermissions<AuthData, Schema>(
	schema,
	() => ({}),
);
