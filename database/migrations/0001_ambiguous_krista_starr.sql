CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "matters_author_type_archived_idx" ON "matters" USING btree ("author_id","type","archived");--> statement-breakpoint
CREATE INDEX "matters_due_date_archived_idx" ON "matters" USING btree ("due_date","archived");--> statement-breakpoint
CREATE INDEX "matters_type_approved_by_idx" ON "matters" USING btree ("type","approved_by");--> statement-breakpoint
CREATE INDEX "matters_team_list_covering_idx" ON "matters" USING btree ("team_id","archived","priority","updated_at","status_id","assignee_id");--> statement-breakpoint
CREATE INDEX "subscriptions_org_status_idx" ON "subscriptions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_period_end_idx" ON "subscriptions" USING btree ("current_period_end");