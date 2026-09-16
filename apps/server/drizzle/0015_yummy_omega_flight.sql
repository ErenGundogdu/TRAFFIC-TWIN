CREATE TYPE "public"."field_report_category" AS ENUM('ACCIDENT', 'CONGESTION', 'ROAD_HAZARD', 'ROAD_DAMAGE', 'SIGNAL_FAILURE', 'SENSOR_ISSUE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."field_report_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."field_report_status" AS ENUM('PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "field_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"source" text DEFAULT 'OPERATOR' NOT NULL,
	"author" text NOT NULL,
	"category" "field_report_category" NOT NULL,
	"severity" "field_report_severity" NOT NULL,
	"status" "field_report_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"description" text NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_reports_source_check" CHECK ("field_reports"."source" = 'OPERATOR'),
	CONSTRAINT "field_reports_author_length_check" CHECK (char_length("field_reports"."author") BETWEEN 2 AND 80),
	CONSTRAINT "field_reports_description_length_check" CHECK (char_length("field_reports"."description") BETWEEN 3 AND 1000)
);
--> statement-breakpoint
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_reports_coverage_status_created_idx" ON "field_reports" USING btree ("coverage_area_id","status","created_at");--> statement-breakpoint
CREATE INDEX "field_reports_location_gix" ON "field_reports" USING gist ("location");
