CREATE TYPE "public"."junction_coverage" AS ENUM('FULL', 'PARTIAL', 'INSUFFICIENT');--> statement-breakpoint
CREATE TYPE "public"."junction_match_confidence" AS ENUM('HIGH', 'MEDIUM');--> statement-breakpoint
CREATE TABLE "derived_junctions" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"osm_relation_id" text NOT NULL,
	"name" text NOT NULL,
	"location" geometry(point, 4326) NOT NULL,
	"road_refs" text[] NOT NULL,
	"coverage" "junction_coverage" NOT NULL,
	"policy_version" text NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"source_fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "junction_sensor_matches" (
	"junction_id" text NOT NULL,
	"station_asset_id" text NOT NULL,
	"road_ref" text NOT NULL,
	"distance_meters" double precision NOT NULL,
	"bearing_difference_degrees" double precision,
	"confidence" "junction_match_confidence" NOT NULL,
	"policy_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "junction_sensor_matches_pk" PRIMARY KEY("junction_id","station_asset_id"),
	CONSTRAINT "junction_sensor_matches_distance_check" CHECK ("junction_sensor_matches"."distance_meters" >= 0),
	CONSTRAINT "junction_sensor_matches_bearing_check" CHECK ("junction_sensor_matches"."bearing_difference_degrees" IS NULL OR "junction_sensor_matches"."bearing_difference_degrees" BETWEEN 0 AND 90)
);
--> statement-breakpoint
ALTER TABLE "derived_junctions" ADD CONSTRAINT "derived_junctions_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "junction_sensor_matches" ADD CONSTRAINT "junction_sensor_matches_junction_id_derived_junctions_id_fk" FOREIGN KEY ("junction_id") REFERENCES "public"."derived_junctions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "junction_sensor_matches" ADD CONSTRAINT "junction_sensor_matches_station_asset_id_traffic_assets_id_fk" FOREIGN KEY ("station_asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "derived_junctions_coverage_osm_uidx" ON "derived_junctions" USING btree ("coverage_area_id","osm_relation_id");--> statement-breakpoint
CREATE INDEX "derived_junctions_location_gix" ON "derived_junctions" USING gist ("location");--> statement-breakpoint
CREATE INDEX "junction_sensor_matches_station_idx" ON "junction_sensor_matches" USING btree ("station_asset_id");
