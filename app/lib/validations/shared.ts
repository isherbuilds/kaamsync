/**
 * Shared validation schemas to reduce duplication across the app.
 * These base schemas are reused in matter, team, and organization validations.
 */

import { z } from "zod";

// ============================================================================
// BASE ENTITY SCHEMAS
// ============================================================================

export const baseEntitySchema = z.object({
	name: z.string().min(1, "Name is required").max(255, "Name too long"),
	description: z.string().max(1000, "Description too long").optional(),
});

export const baseSlugSchema = z.object({
	slug: z
		.string()
		.min(2, "Slug must be at least 2 characters")
		.max(50, "Slug too long")
		.regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
		.refine(s => !s.startsWith("-") && !s.endsWith("-"), "Slug cannot start or end with hyphen"),
});

// ============================================================================
// COMMON FIELD SCHEMAS
// ============================================================================

export const prioritySchema = z.coerce.number().min(0).max(4);
export const statusSchema = z.string().min(1, "Status is required");
export const teamIdSchema = z.string().min(1, "Team is required");
export const userIdSchema = z.string().min(1, "User is required");

// ============================================================================
// EMAIL & CONTACT SCHEMAS
// ============================================================================

export const emailSchema = z
	.string()
	.email("Invalid email address")
	.transform(email => email.toLowerCase().trim());

export const passwordSchema = z
	.string()
	.min(8, "Password must be at least 8 characters")
	.max(128, "Password too long");

// ============================================================================
// DATE & TIME SCHEMAS
// ============================================================================

export const dateSchema = z.coerce.date();
export const optionalDateSchema = z.coerce.date().optional();

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

export const colorSchema = z
	.string()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #FF0000)")
	.optional();

export const urlSchema = z
	.string()
	.url("Invalid URL")
	.optional();

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Create a schema for confirming passwords match
 */
export const createPasswordConfirmationSchema = (passwordField = "password") =>
	z.object({
		[passwordField]: passwordSchema,
		confirmPassword: z.string(),
	}).refine(
		data => data[passwordField as keyof typeof data] === data.confirmPassword,
		{
			message: "Passwords do not match",
			path: ["confirmPassword"],
		}
	);

/**
 * Create a schema for unique slug validation (client-side only)
 */
export const createUniqueSlugSchema = (reservedSlugs: string[] = []) =>
	baseSlugSchema.extend({
		slug: baseSlugSchema.shape.slug.refine(
			slug => !reservedSlugs.includes(slug),
			"This slug is reserved and cannot be used"
		),
	});