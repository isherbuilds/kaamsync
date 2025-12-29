import { z } from "zod";
import { Priority } from "~/lib/matter-constants";

// Matter validation schemas
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 800;

export const matterTitleSchema = z
	.string({ message: "Title is required." })
	.min(
		MIN_TITLE_LENGTH,
		`Title must be at least ${MIN_TITLE_LENGTH} characters.`,
	)
	.max(
		MAX_TITLE_LENGTH,
		`Title must be at most ${MAX_TITLE_LENGTH} characters.`,
	)
	.trim();

export const matterDescriptionSchema = z
	.string()
	.max(
		MAX_DESCRIPTION_LENGTH,
		`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
	)
	.optional();

export const createMatterSchema = z.object({
	title: matterTitleSchema,
	description: matterDescriptionSchema,
	statusId: z.string().optional(),
	// TODO: Think this through more - should unassigned be allowed?
	assigneeId: z.string().nullable(),
	priority: z.number().int().min(0).max(4).default(Priority.NONE),
	dueDate: z.string().optional(),
});

export const approveRequestSchema = z.object({
	requestId: z.string().min(1, "Request ID is required."),
	action: z.enum(["approve", "reject"]),
});
