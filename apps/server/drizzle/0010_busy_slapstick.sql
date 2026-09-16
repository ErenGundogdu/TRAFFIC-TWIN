CREATE TYPE "public"."traffic_event_category" AS ENUM('TRAFFIC_ANNOUNCEMENT', 'ROAD_WORK');--> statement-breakpoint
CREATE TYPE "public"."traffic_event_severity" AS ENUM('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."traffic_event_status" AS ENUM('UPCOMING', 'ACTIVE', 'ENDED');--> statement-breakpoint
CREATE TABLE "traffic_event_syncs" (
	"coverage_area_id" text PRIMARY KEY NOT NULL,
	"source_updated_at" timestamp with time zone,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_events" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"category" "traffic_event_category" NOT NULL,
	"status" "traffic_event_status" NOT NULL,
	"severity" "traffic_event_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"comment" text,
	"language" text NOT NULL,
	"geometry" jsonb NOT NULL,
	"road_numbers" integer[] NOT NULL,
	"release_time" timestamp with time zone NOT NULL,
	"version_time" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traffic_event_syncs" ADD CONSTRAINT "traffic_event_syncs_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_events" ADD CONSTRAINT "traffic_events_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "traffic_events_provider_event_uidx" ON "traffic_events" USING btree ("coverage_area_id","provider_event_id");--> statement-breakpoint
CREATE INDEX "traffic_events_coverage_status_idx" ON "traffic_events" USING btree ("coverage_area_id","status","starts_at");