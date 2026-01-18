ALTER TABLE "sessions_table" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "users_table" ADD COLUMN "banned" boolean;--> statement-breakpoint
ALTER TABLE "users_table" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users_table" ADD COLUMN "ban_expires" timestamp with time zone;