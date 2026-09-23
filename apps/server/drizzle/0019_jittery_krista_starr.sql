CREATE TYPE "public"."raw_file_status" AS ENUM('RETAINED', 'PURGED', 'MISSING');--> statement-breakpoint
ALTER TABLE "ingestion_artifacts" ADD COLUMN "raw_file_status" "raw_file_status" DEFAULT 'RETAINED' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingestion_artifacts" ADD COLUMN "raw_file_purged_at" timestamp with time zone;