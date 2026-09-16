CREATE TYPE "public"."road_context_status" AS ENUM('MATCHED', 'NO_MATCH');--> statement-breakpoint
CREATE TABLE "station_road_contexts" (
	"asset_id" text PRIMARY KEY NOT NULL,
	"status" "road_context_status" NOT NULL,
	"road_ref" text,
	"matching_policy" text NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"segments" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "station_road_contexts" ADD CONSTRAINT "station_road_contexts_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;