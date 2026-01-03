import { z } from "zod";

// Constants
const MIN_NAME_LENGTH = 4;
const MAX_NAME_LENGTH = 64;
const MIN_SLUG_LENGTH = 2;
const MAX_SLUG_LENGTH = 64;
const MIN_CODE_LENGTH = 2;
const MAX_CODE_LENGTH = 6;

export const reservedSlugs = [
	// Authentication & Account
	"login",
	"signup",
	"register",
	"auth",
	"authentication",
	"account",
	"join",

	// Core App
	"app",
	"dashboard",
	"home",
	"admin",

	// Settings & Billing
	"settings",
	"billing",
	"enterprise",
	"enterprises",

	// Support & Help
	"support",
	"help",
	"docs",
	"documentation",
	"contact",

	// Marketing & Product
	"about",
	"features",
	"pricing",
	"plans",
	"customers",
	"customer",
	"customer-requests",
	"customer-stories",
	"startups",
	"small-business",
	"compare",
	"demo",
	"watch-demo",
	"get-started",
	"signin",

	// Solutions & Industries
	"solutions",
	"engineering",
	"financial-services",
	"sales",
	"it",
	"marketing",
	"customer-support",
	"human-resources",
	"hr",
	"project-management",
	"media",
	"productivity",

	// Operations Management
	"static",
	"operations",
	"ops",
	"supply-chain",
	"logistics",
	"inventory",
	"manufacturing",
	"field-service",
	"field-operations",
	"procurement",
	"purchasing",
	"compliance",
	"quality",
	"quality-management",
	"fleet",
	"fleet-management",

	// Resources & Learning
	"resources",
	"library",
	"events",
	"webinars",
	"community",
	"partners",

	// Product Features (Linear-inspired)
	"plan",
	"build",
	"insights",
	"asks",
	"changelog",
	"now",

	// Technical & Integrations
	"api",
	"developers",
	"integrations",
	"download",
	"switch",
	"mobile",

	// Brand & Company
	"blog",
	"careers",
	"readme",
	"quality",
	"brand",
	"method",
	"about-us",
	"leadership",
	"news",
	"media-kit",
	"investors",
	"company",

	// Legal & Compliance
	"privacy",
	"terms",
	"legal",
	"security",
	"dpa",

	// Infrastructure
	"status",
	"www",

	// AI & Special
	"ai",
];

export const reservedTeamSlugs = [
	// Organization-level Settings & Management
	"settings",
	"members",
	"team",
	"teams",
	"people",
	"users",
	"billing",
	"subscription",
	"admin",
	"organization",
	"org",

	// Core Navigation
	"dashboard",
	"home",
	"overview",

	// Content Types (org-level routes)
	"tasks",
	"requests",
	"matters",
	"projects",
	"workflows",
	"templates",
	"channels",
	"directory",
	"roles",

	// Business Features
	"analytics",
	"reports",
	"reporting",
	"insights",
	"activity",
	"audit",
	"calendar",
	"schedule",
	"notifications",
	"alerts",

	// Integrations & Automations
	"integrations",
	"apps",
	"automations",
	"webhooks",
	"api",

	// Invitations & Onboarding
	"invitations",
	"invite",
	"invites",
	"join",

	// Data Management
	"export",
	"exports",
	"import",
	"imports",
	"backup",

	// Authentication (should not be teams)
	"login",
	"signup",
	"register",
	"auth",

	// Legal & Info
	"docs",
	"help",
	"support",
	"about",
	"contact",
	"privacy",
	"terms",

	// CRUD Operations
	"new",
	"edit",
	"update",
	"create",
	"delete",
	"archive",
	"archived",
	"trash",
];

// Shared primitives for organization flows
export const orgNameSchema = z
	.string({ message: "Organization name is required." })
	.min(MIN_NAME_LENGTH, "Name must be at least 4 characters.")
	.max(MAX_NAME_LENGTH, "Name must be at most 64 characters.")
	.trim();

export const slugSchema = z
	.string({ message: "Slug is required." })
	.toLowerCase()
	.trim()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
		message: "Use lowercase letters, numbers, and hyphens only.",
	})
	.min(MIN_SLUG_LENGTH, "Slug must be at least 2 characters.")
	.max(MAX_SLUG_LENGTH, "Slug must be at most 64 characters.")
	.refine((slug) => !reservedSlugs.includes(slug), {
		message: "This URL is reserved.",
	});

// Note: downstream flows can use a discriminated union instead of separate forms

// Discriminated union: explicit intent = "create" | "join"
export const orgOnboardingSchema = z.discriminatedUnion("intent", [
	z.object({
		intent: z.literal("create"),
		name: orgNameSchema,
		slug: slugSchema,
		// teamName: z.string().min(4).max(32).trim(),
	}),
	z.object({
		intent: z.literal("join"),
		invitationId: z.string({ message: "Invitation ID is required." }),
		joinOrgSlug: z.string(), // for convenience, not validated
	}),
]);

// Team validation schemas
export const teamNameSchema = z
	.string({ message: "Team name is required." })
	.min(MIN_NAME_LENGTH, "Name must be at least 4 characters.")
	.max(MAX_NAME_LENGTH, "Name must be at most 64 characters.")
	.trim();

export const teamCodeSchema = z
	.string()
	.toUpperCase()
	.trim()
	.length(3, "Code must be exactly 3 characters.");

export const createTeamSchema = z.object({
	name: teamNameSchema.refine(
		(name) => {
			const slug = name
				.toLowerCase()
				.trim()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "");
			return !reservedTeamSlugs.includes(slug);
		},
		{
			message: "This name generates a reserved URL.",
		},
	),
	code: teamCodeSchema,
	visibility: z.enum(["public", "private"]).optional(),
});

export const updateTeamSchema = z.object({
	teamId: z.string(),
	name: teamNameSchema.optional(),
	code: teamCodeSchema,
	visibility: z.enum(["public", "private"]).optional(),
});
