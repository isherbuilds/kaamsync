/**
 * Shared validation schemas to reduce duplication across the app.
 * These base schemas are reused in matter, team, and organization validations.
 */

import { z } from "zod";

// ============================================================================
// Entity Schemas
// ============================================================================

export const entityNameSchema = z
	.string()
	.min(1, "Name is required")
	.max(255, "Name too long");

export const entityDescriptionSchema = z
	.string()
	.max(1000, "Description too long")
	.optional();

export const baseEntitySchema = z.object({
	name: entityNameSchema,
	description: entityDescriptionSchema,
});

export const slugSchema = z
	.string()
	.min(2, "Slug must be at least 2 characters")
	.max(50, "Slug too long")
	.regex(
		/^[a-z0-9-]+$/,
		"Slug can only contain lowercase letters, numbers, and hyphens"
	)
	.refine(
		(s) => !s.startsWith("-") && !s.endsWith("-"),
		"Slug cannot start or end with hyphen"
	);

export const baseSlugSchema = z.object({ slug: slugSchema });

// ============================================================================
// Common Field Schemas
// ============================================================================

export const prioritySchema = z.coerce.number().min(0).max(4);
export const statusSchema = z.string().min(1, "Status is required");
export const teamIdSchema = z.string().min(1, "Team is required");
export const userIdSchema = z.string().min(1, "User is required");

// ============================================================================
// Auth Schemas
// ============================================================================

export const emailSchema = z
	.string()
	.trim()
	.email("Invalid email address")
	.transform((email) => email.toLowerCase());

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password too long");

// ============================================================================
// Date Schemas
// ============================================================================

export const dateSchema = z.coerce.date();
export const optionalDateSchema = z.coerce.date().optional();

// ============================================================================
// Utility Schemas
// ============================================================================

export const hexColorSchema = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF0000)")
	.optional();

export const urlSchema = z.string().url("Invalid URL").optional();

// ============================================================================
// Schema Factories
// ============================================================================

export function createPasswordConfirmationSchema(passwordField = "password") {
	return z
		.object({
			[passwordField]: passwordSchema,
			confirmPassword: z.string(),
		})
		.refine(
			(data) =>
				data[passwordField as keyof typeof data] === data.confirmPassword,
			{
				message: "Passwords do not match",
				path: ["confirmPassword"],
			}
		);
}

export function createUniqueSlugSchema(reservedSlugs: string[] = []) {
	return baseSlugSchema.extend({
		slug: slugSchema.refine(
			(slug) => !reservedSlugs.includes(slug),
			"This slug is reserved and cannot be used"
		),
	});
}
