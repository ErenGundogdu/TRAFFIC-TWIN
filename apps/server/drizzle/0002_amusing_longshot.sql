CREATE TABLE "operator_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"coverage_area_id" text NOT NULL,
	"author" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traffic_observations" (
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"average_speed_kmh" double precision,
	"flow_vehicles_per_hour" double precision,
	"source_updated_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_observations_pk" PRIMARY KEY("asset_id","direction","measured_at")
);
--> statement-breakpoint
ALTER TABLE "operator_notes" ADD CONSTRAINT "operator_notes_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operator_notes" ADD CONSTRAINT "operator_notes_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_observations" ADD CONSTRAINT "traffic_observations_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "operator_notes_asset_created_idx" ON "operator_notes" USING btree ("asset_id","created_at");--> statement-breakpoint
CREATE INDEX "traffic_observations_asset_time_idx" ON "traffic_observations" USING btree ("asset_id","measured_at");