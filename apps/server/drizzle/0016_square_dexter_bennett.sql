CREATE TYPE "public"."history_import_job_status" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED');--> statement-breakpoint
CREATE TABLE "history_import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"requested_day_count" integer NOT NULL,
	"target_day_count" integer NOT NULL,
	"source_dates" jsonb NOT NULL,
	"completed_day_count" integer DEFAULT 0 NOT NULL,
	"successful_day_count" integer DEFAULT 0 NOT NULL,
	"failed_day_count" integer DEFAULT 0 NOT NULL,
	"skipped_day_count" integer DEFAULT 0 NOT NULL,
	"current_source_date" date,
	"status" "history_import_job_status" DEFAULT 'QUEUED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "history_import_jobs_range_check" CHECK ("history_import_jobs"."from_date" <= "history_import_jobs"."to_date"),
	CONSTRAINT "history_import_jobs_counts_check" CHECK ("history_import_jobs"."requested_day_count" >= "history_import_jobs"."target_day_count" AND "history_import_jobs"."target_day_count" > 0 AND "history_import_jobs"."completed_day_count" >= 0 AND "history_import_jobs"."successful_day_count" >= 0 AND "history_import_jobs"."failed_day_count" >= 0 AND "history_import_jobs"."skipped_day_count" >= 0 AND "history_import_jobs"."completed_day_count" = "history_import_jobs"."successful_day_count" + "history_import_jobs"."failed_day_count" + "history_import_jobs"."skipped_day_count" AND "history_import_jobs"."completed_day_count" <= "history_import_jobs"."target_day_count"),
	CONSTRAINT "history_import_jobs_source_dates_check" CHECK (jsonb_typeof("history_import_jobs"."source_dates") = 'array' AND jsonb_array_length("history_import_jobs"."source_dates") = "history_import_jobs"."target_day_count")
);
--> statement-breakpoint
ALTER TABLE "history_import_jobs" ADD CONSTRAINT "history_import_jobs_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_import_jobs" ADD CONSTRAINT "history_import_jobs_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_import_jobs_status_created_idx" ON "history_import_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "history_import_jobs_active_range_uidx" ON "history_import_jobs" USING btree ("coverage_area_id","asset_id","from_date","to_date") WHERE "history_import_jobs"."status" IN ('QUEUED', 'RUNNING');