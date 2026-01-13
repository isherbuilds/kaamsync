CREATE TABLE "accounts_table" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"matter_id" text NOT NULL,
	"uploader_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"dodo_customer_id" text,
	"email" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "customers_dodo_customer_id_unique" UNIQUE("dodo_customer_id")
);
--> statement-breakpoint
CREATE TABLE "invitations_table" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(50),
	"description" text,
	"archived" boolean,
	"creator_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "matter_labels" (
	"matter_id" text NOT NULL,
	"label_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_labels_matter_id_label_id_pk" PRIMARY KEY("matter_id","label_id")
);
--> statement-breakpoint
CREATE TABLE "matter_subscriptions" (
	"user_id" text NOT NULL,
	"matter_id" text NOT NULL,
	"subscribed" boolean,
	"reason" varchar(50),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_subscriptions_user_id_matter_id_pk" PRIMARY KEY("user_id","matter_id")
);
--> statement-breakpoint
CREATE TABLE "matter_views" (
	"user_id" text NOT NULL,
	"matter_id" text NOT NULL,
	"last_viewed_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_views_user_id_matter_id_pk" PRIMARY KEY("user_id","matter_id")
);
--> statement-breakpoint
CREATE TABLE "matter_watchers" (
	"matter_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by" text NOT NULL,
	"reason" varchar(100),
	"notify_on_update" boolean,
	"can_comment" boolean,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "matter_watchers_matter_id_user_id_pk" PRIMARY KEY("matter_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "matters" (
	"id" text PRIMARY KEY NOT NULL,
	"short_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"team_id" text NOT NULL,
	"author_id" text NOT NULL,
	"assignee_id" text,
	"status_id" text NOT NULL,
	"team_code" varchar(50) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"priority" smallint DEFAULT 4 NOT NULL,
	"source" varchar(50),
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"due_date" timestamp with time zone,
	"start_date" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"estimated_hours" integer,
	"actual_hours" integer,
	"archived" boolean,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "members_table" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations_table" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"subscription_id" text,
	"dodo_payment_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_dodo_payment_id_unique" UNIQUE("dodo_payment_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions_table" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "sessions_table_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(50),
	"type" varchar(50) NOT NULL,
	"position" integer NOT NULL,
	"is_default" boolean,
	"archived" boolean,
	"creator_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "storage_usage_cache" (
	"org_id" text PRIMARY KEY NOT NULL,
	"total_bytes" integer DEFAULT 0 NOT NULL,
	"file_count" integer DEFAULT 0 NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"dodo_subscription_id" text,
	"product_id" text NOT NULL,
	"plan_key" text,
	"status" text NOT NULL,
	"billing_interval" text,
	"amount" integer,
	"currency" text DEFAULT 'USD',
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_dodo_subscription_id_unique" UNIQUE("dodo_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"can_create_tasks" boolean,
	"can_create_requests" boolean,
	"can_approve_requests" boolean,
	"can_manage_members" boolean,
	"can_manage_team" boolean,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"icon" varchar(255),
	"description" text,
	"next_short_id" integer NOT NULL,
	"visibility" varchar(20) NOT NULL,
	"archived" boolean,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"id" text PRIMARY KEY NOT NULL,
	"matter_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"content" text,
	"from_status_id" text,
	"to_status_id" text,
	"from_assignee_id" text,
	"to_assignee_id" text,
	"label_id" text,
	"from_value" text,
	"to_value" text,
	"mentions" text,
	"edited" boolean,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users_table" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_table_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications_table" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"webhook_id" text NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" text,
	CONSTRAINT "webhook_events_webhook_id_unique" UNIQUE("webhook_id")
);
--> statement-breakpoint
ALTER TABLE "accounts_table" ADD CONSTRAINT "accounts_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploader_id_users_table_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_table_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations_table" ADD CONSTRAINT "invitations_table_organization_id_organizations_table_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations_table" ADD CONSTRAINT "invitations_table_inviter_id_users_table_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_creator_id_users_table_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_labels" ADD CONSTRAINT "matter_labels_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_labels" ADD CONSTRAINT "matter_labels_label_id_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."labels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_subscriptions" ADD CONSTRAINT "matter_subscriptions_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_subscriptions" ADD CONSTRAINT "matter_subscriptions_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_views" ADD CONSTRAINT "matter_views_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_views" ADD CONSTRAINT "matter_views_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_watchers" ADD CONSTRAINT "matter_watchers_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_watchers" ADD CONSTRAINT "matter_watchers_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matter_watchers" ADD CONSTRAINT "matter_watchers_added_by_users_table_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_author_id_users_table_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_assignee_id_users_table_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matters" ADD CONSTRAINT "matters_approved_by_users_table_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_table" ADD CONSTRAINT "members_table_organization_id_organizations_table_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members_table" ADD CONSTRAINT "members_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_table_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions_table" ADD CONSTRAINT "sessions_table_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statuses" ADD CONSTRAINT "statuses_creator_id_users_table_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_usage_cache" ADD CONSTRAINT "storage_usage_cache_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_table_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_org_id_organizations_table_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations_table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_matter_id_matters_id_fk" FOREIGN KEY ("matter_id") REFERENCES "public"."matters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_user_id_users_table_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_table"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accountsTable_userId_idx" ON "accounts_table" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attachments_matter_idx" ON "attachments" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "attachments_org_idx" ON "attachments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "attachments_uploader_idx" ON "attachments" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "customers_org_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_dodo_idx" ON "customers" USING btree ("dodo_customer_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitationsTable_organizationId_idx" ON "invitations_table" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitationsTable_email_idx" ON "invitations_table" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_org_name_unique" ON "labels" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "labels_org_idx" ON "labels" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "labels_org_archived_idx" ON "labels" USING btree ("org_id","archived");--> statement-breakpoint
CREATE INDEX "matter_labels_matter_idx" ON "matter_labels" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_labels_label_idx" ON "matter_labels" USING btree ("label_id");--> statement-breakpoint
CREATE INDEX "matter_subscriptions_user_subscribed_idx" ON "matter_subscriptions" USING btree ("user_id","subscribed");--> statement-breakpoint
CREATE INDEX "matter_views_user_activity_idx" ON "matter_views" USING btree ("user_id","last_activity_at");--> statement-breakpoint
CREATE INDEX "matter_watchers_matter_idx" ON "matter_watchers" USING btree ("matter_id");--> statement-breakpoint
CREATE INDEX "matter_watchers_user_idx" ON "matter_watchers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "matter_watchers_added_by_idx" ON "matter_watchers" USING btree ("added_by");--> statement-breakpoint
CREATE UNIQUE INDEX "matters_team_short_id_unique" ON "matters" USING btree ("team_id","short_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matters_team_code_short_id_unique" ON "matters" USING btree ("team_code","short_id");--> statement-breakpoint
CREATE INDEX "matters_short_id_idx" ON "matters" USING btree ("short_id");--> statement-breakpoint
CREATE INDEX "matters_team_idx" ON "matters" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "matters_team_archived_updated_idx" ON "matters" USING btree ("team_id","archived","updated_at");--> statement-breakpoint
CREATE INDEX "matters_team_status_updated_idx" ON "matters" USING btree ("team_id","status_id","updated_at");--> statement-breakpoint
CREATE INDEX "matters_team_assignee_archived_idx" ON "matters" USING btree ("team_id","assignee_id","archived");--> statement-breakpoint
CREATE INDEX "matters_team_priority_archived_idx" ON "matters" USING btree ("team_id","priority","archived");--> statement-breakpoint
CREATE INDEX "matters_assignee_archived_idx" ON "matters" USING btree ("assignee_id","archived");--> statement-breakpoint
CREATE INDEX "matters_author_idx" ON "matters" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "matters_author_type_archived_idx" ON "matters" USING btree ("author_id","type","archived");--> statement-breakpoint
CREATE INDEX "matters_org_archived_updated_idx" ON "matters" USING btree ("org_id","archived","updated_at");--> statement-breakpoint
CREATE INDEX "matters_due_date_idx" ON "matters" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "matters_due_date_archived_idx" ON "matters" USING btree ("due_date","archived");--> statement-breakpoint
CREATE INDEX "matters_team_type_idx" ON "matters" USING btree ("team_id","type");--> statement-breakpoint
CREATE INDEX "matters_approved_by_idx" ON "matters" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "matters_type_approved_by_idx" ON "matters" USING btree ("type","approved_by");--> statement-breakpoint
CREATE INDEX "matters_team_list_covering_idx" ON "matters" USING btree ("team_id","archived","priority","updated_at","status_id","assignee_id");--> statement-breakpoint
CREATE INDEX "membersTable_organizationId_idx" ON "members_table" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "membersTable_userId_idx" ON "members_table" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizationsTable_slug_uidx" ON "organizations_table" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "payments_customer_idx" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_org_idx" ON "payments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_dodo_idx" ON "payments" USING btree ("dodo_payment_id");--> statement-breakpoint
CREATE INDEX "payments_org_created_idx" ON "payments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "sessionsTable_userId_idx" ON "sessions_table" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "statuses_team_position_idx" ON "statuses" USING btree ("team_id","position");--> statement-breakpoint
CREATE INDEX "subscriptions_customer_idx" ON "subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_dodo_idx" ON "subscriptions" USING btree ("dodo_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_status_idx" ON "subscriptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_period_end_idx" ON "subscriptions" USING btree ("current_period_end");--> statement-breakpoint
CREATE INDEX "team_memberships_team_idx" ON "team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_memberships_user_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_org_user_idx" ON "team_memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_user_unique" ON "team_memberships" USING btree ("team_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_org_slug_unique" ON "teams" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_org_code_unique" ON "teams" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "teams_org_archived_idx" ON "teams" USING btree ("org_id","archived");--> statement-breakpoint
CREATE INDEX "teams_org_code_idx" ON "teams" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "timelines_matter_created_idx" ON "timelines" USING btree ("matter_id","created_at");--> statement-breakpoint
CREATE INDEX "timelines_user_idx" ON "timelines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verificationsTable_identifier_idx" ON "verifications_table" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_webhook_id_idx" ON "webhook_events" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_events_type_idx" ON "webhook_events" USING btree ("event_type");