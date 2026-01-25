/**
 * Environment variable validation and type safety
 * Ensures all required environment variables are present and valid
 */

import { z } from "zod";

// Define the schema for environment variables
const envSchema = z.object({
	// Database
	ZERO_UPSTREAM_DB: z.string().min(1, "ZERO_UPSTREAM_DB is required"),

	// Authentication
	BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
	BETTER_AUTH_URL: z.string().min(1, "BETTER_AUTH_URL is required"),

	// OAuth (optional)
	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),

	// Dodo Payments (optional)
	DODO_PAYMENTS_API_KEY: z.string().optional(),
	DODO_PAYMENTS_WEBHOOK_SECRET: z.string().optional(),
	DODO_PAYMENTS_ENVIRONMENT: z
		.enum(["test_mode", "live_mode"])
		.default("test_mode"),

	// Product IDs (optional)
	DODO_PRODUCT_GROWTH_MONTHLY: z.string().optional(),
	DODO_PRODUCT_GROWTH_YEARLY: z.string().optional(),
	DODO_PRODUCT_PROFESSIONAL_MONTHLY: z.string().optional(),
	DODO_PRODUCT_PROFESSIONAL_YEARLY: z.string().optional(),

	// Addon IDs (optional)
	DODO_ADDON_SEAT_GROWTH: z.string().optional(),
	DODO_ADDON_SEAT_PRO: z.string().optional(),
	DODO_ADDON_STORAGE_GROWTH: z.string().optional(),
	DODO_ADDON_STORAGE_PRO: z.string().optional(),

	// Email (optional)
	USESEND_API_KEY: z.string().optional(),
	USESEND_SELF_HOSTED_URL: z.string().optional(),

	// Storage - S3-compatible (optional, works with AWS S3, Cloudflare R2, MinIO)
	S3_ACCESS_KEY_ID: z.string().optional(),
	S3_SECRET_ACCESS_KEY: z.string().optional(),
	S3_BUCKET_NAME: z.string().optional(),
	S3_REGION: z.string().default("auto"),
	S3_ENDPOINT: z.string().optional(), // For R2/MinIO
	S3_PUBLIC_URL: z.string().optional(), // Public URL for downloads

	// Application
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	SITE_URL: z.string().min(1, "SITE_URL is required"),

	// Optional
	PORT: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Validate environment variables - fail fast on invalid config
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
	console.error("❌ Environment validation failed:");
	for (const issue of parseResult.error.issues) {
		console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

// Export validated environment variables with proper types
export const env = parseResult.data;

// Helper functions for environment-specific logic
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

// Validate OAuth configuration
export const hasGoogleOAuth = !!(
	env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);

// Validate Dodo Payments configuration
export const hasDodoPayments = !!(
	env.DODO_PAYMENTS_API_KEY && env.DODO_PAYMENTS_WEBHOOK_SECRET
);
