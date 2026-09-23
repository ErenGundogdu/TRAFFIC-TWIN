CREATE TYPE "public"."history_import_job_purpose" AS ENUM('INTERACTIVE', 'ROLLING_COVERAGE');--> statement-breakpoint
DROP INDEX "history_import_jobs_status_created_idx";--> statement-breakpoint
ALTER TABLE "history_import_jobs" ADD COLUMN "purpose" "history_import_job_purpose" DEFAULT 'INTERACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "history_import_jobs" ADD COLUMN "priority" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
CREATE INDEX "history_import_jobs_status_priority_created_idx" ON "history_import_jobs" USING btree ("status","priority","created_at");--> statement-breakpoint
ALTER TABLE "history_import_jobs" ADD CONSTRAINT "history_import_jobs_priority_check" CHECK ("history_import_jobs"."priority" BETWEEN 0 AND 100);