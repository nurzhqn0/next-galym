ALTER TABLE "application_forms" ADD COLUMN "link_column" varchar(200);--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "status_column" varchar(200);--> statement-breakpoint
ALTER TABLE "application_forms" ADD COLUMN "deadline_column" varchar(200);--> statement-breakpoint
ALTER TABLE "application_submissions" ADD COLUMN "external" boolean DEFAULT false NOT NULL;