CREATE TABLE "traffic_direction_profiles" (
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"free_flow_speed_kmh" double precision,
	"maximum_flow_vehicles_per_hour" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_direction_profiles_pk" PRIMARY KEY("asset_id","direction"),
	CONSTRAINT "traffic_direction_profiles_direction_check" CHECK ("traffic_direction_profiles"."direction" IN (1, 2)),
	CONSTRAINT "traffic_direction_profiles_values_check" CHECK (("traffic_direction_profiles"."free_flow_speed_kmh" IS NULL OR "traffic_direction_profiles"."free_flow_speed_kmh" > 0) AND ("traffic_direction_profiles"."maximum_flow_vehicles_per_hour" IS NULL OR "traffic_direction_profiles"."maximum_flow_vehicles_per_hour" > 0))
);
--> statement-breakpoint
ALTER TABLE "traffic_observations" ADD COLUMN "speed_percent_of_free_flow" double precision;--> statement-breakpoint
ALTER TABLE "traffic_observations" ADD COLUMN "flow_percent_of_capacity" double precision;--> statement-breakpoint
ALTER TABLE "traffic_direction_profiles" ADD CONSTRAINT "traffic_direction_profiles_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;