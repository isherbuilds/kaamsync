import { z } from "zod";
import { Priority } from "~/config/matter";
import {
	optionalDateSchema,
	prioritySchema,
	statusSchema,
	userIdSchema,
} from "~/lib/infra/shared-validations";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 800;

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

export const matterTitleFieldSchema = z
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

export const matterDescriptionFieldSchema = z
	.string()
	.max(
		MAX_DESCRIPTION_LENGTH,
		`Description must be at most ${MAX_DESCRIPTION_LENGTH} characters.`,
	)
	.optional();

// ============================================================================
// FORM SCHEMAS
// ============================================================================

export const matterCreateFormSchema = z.object({
	title: matterTitleFieldSchema,
	description: matterDescriptionFieldSchema,
	statusId: statusSchema.optional(),
	assigneeId: userIdSchema.nullable(),
	priority: z.number().int().min(0).max(4).default(Priority.NONE),
	dueDate: z.string().optional(),
});

export const requestApprovalFormSchema = z.object({
	requestId: z.string().min(1, "Request ID is required."),
	action: z.enum(["approve", "reject"]),
});

export const matterUpdateFormSchema = matterCreateFormSchema.partial().extend({
	id: z.string().min(1, "Matter ID is required"),
});

export const matterAssignFormSchema = z.object({
	id: z.string().min(1, "Matter ID is required"),
	assigneeId: userIdSchema.nullable(),
});

export const matterStatusUpdateFormSchema = z.object({
	id: z.string().min(1, "Matter ID is required"),
	statusId: statusSchema,
});

export const matterCommentFormSchema = z.object({
	matterId: z.string().min(1, "Matter ID is required"),
	content: z
		.string()
		.min(1, "Comment cannot be empty")
		.max(2000, "Comment too long"),
	mentions: z.array(z.string()).optional(),
});
