CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."traffic_asset_kind" AS ENUM('sensor-station', 'junction', 'road-segment', 'corridor', 'traffic-zone');--> statement-breakpoint
CREATE TABLE "coverage_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"time_zone" text NOT NULL,
	"min_longitude" double precision NOT NULL,
	"min_latitude" double precision NOT NULL,
	"max_longitude" double precision NOT NULL,
	"max_latitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_station_id" integer NOT NULL,
	"tms_number" integer NOT NULL,
	"kind" "traffic_asset_kind" NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"bearing" double precision,
	"collecting" boolean NOT NULL,
	"capabilities" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"source_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "traffic_assets" ADD CONSTRAINT "traffic_assets_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "traffic_assets_provider_station_uidx" ON "traffic_assets" USING btree ("provider","provider_station_id");--> statement-breakpoint
CREATE INDEX "traffic_assets_coverage_area_idx" ON "traffic_assets" USING btree ("coverage_area_id");--> statement-breakpoint
CREATE INDEX "traffic_assets_location_gix" ON "traffic_assets" USING gist ("location");--> statement-breakpoint
INSERT INTO "coverage_areas" (
	"id",
	"name",
	"time_zone",
	"min_longitude",
	"min_latitude",
	"max_longitude",
	"max_latitude"
) VALUES (
	'helsinki',
	'Helsinki metropol bölgesi',
	'Europe/Helsinki',
	24.5,
	60.1,
	25.25,
	60.45
) ON CONFLICT ("id") DO NOTHING;
