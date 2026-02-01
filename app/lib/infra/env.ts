/**
 * Environment variable validation and type safety.
 * Ensures all required environment variables are present and valid.
 */

import { z } from "zod";

// ============================================================================
// Schema Definition
// ============================================================================

const envSchema = z.object({
	// Database
	ZERO_UPSTREAM_DB: z.string().min(1, "ZERO_UPSTREAM_DB is required"),

	// Authentication
	BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
	BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is required"),

	// OAuth
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),

	// Dodo Payments
	DODO_PAYMENTS_API_KEY: z.string().optional(),
	DODO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),
	DODO_PAYMENTS_ENVIRONMENT: z
		.enum(["test_mode", "live_mode"])
		.default("test_mode"),

	// Product IDs
	DODO_PRODUCT_GROWTH_MONTHLY: z.string().optional(),
	DODO_PRODUCT_GROWTH_YEARLY: z.string().optional(),
	DODO_PRODUCT_PROFESSIONAL_MONTHLY: z.string().optional(),
	DODO_PRODUCT_PROFESSIONAL_YEARLY: z.string().optional(),

	// Addon IDs
	DODO_ADDON_SEAT_GROWTH: z.string().optional(),
	DODO_ADDON_SEAT_PRO: z.string().optional(),
	DODO_ADDON_STORAGE_GROWTH: z.string().optional(),
	DODO_ADDON_STORAGE_PRO: z.string().optional(),

	// Email
	USESEND_API_KEY: z.string().optional(),
	USESEND_SELF_HOSTED_URL: z.string().optional(),

	// Storage (S3-compatible)
	STORAGE_ACCESS_KEY_ID: z.string().optional(),
	STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
	STORAGE_BUCKET_NAME: z.string().optional(),
	STORAGE_REGION: z.string().default("auto"),
	STORAGE_ENDPOINT: z.string().optional(),
	STORAGE_PUBLIC_URL: z.string().optional(),

	// Application
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	SITE_URL: z.string().min(1, "SITE_URL is required"),
	PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type Env = z.infer<typeof envSchema>;

// ============================================================================
// Validation
// ============================================================================

function validateEnv(): Env {
	if (typeof process === "undefined" || !process.env) {
		return {} as Env;
	}

	const parseResult = envSchema.safeParse(process.env);

	if (!parseResult.success) {
		console.error("❌ Environment validation failed:");
		for (const issue of parseResult.error.issues) {
			console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
		}
		process.exit(1);
	}

	return parseResult.data;
}

export const env: Env = validateEnv();

// ============================================================================
// Environment Helpers
// ============================================================================

export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// ============================================================================
// Feature Flags
// ============================================================================

export const hasGoogleOAuth = !!(
	env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);

export const hasDodoPayments = !!(
	env.DODO_PAYMENTS_API_KEY && env.DODO_PAYMENTS_WEBHOOK_SECRET
);
