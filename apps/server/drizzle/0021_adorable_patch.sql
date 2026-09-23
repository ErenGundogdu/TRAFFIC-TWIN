CREATE TABLE "traffic_lane_observations" (
	"asset_id" text NOT NULL,
	"lane" integer NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"average_speed_kmh" double precision,
	"flow_vehicles_per_hour" double precision,
	"source_updated_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_lane_observations_pk" PRIMARY KEY("asset_id","lane","measured_at"),
	CONSTRAINT "traffic_lane_observations_lane_check" CHECK ("traffic_lane_observations"."lane" > 0),
	CONSTRAINT "traffic_lane_observations_value_check" CHECK (("traffic_lane_observations"."average_speed_kmh" IS NOT NULL AND "traffic_lane_observations"."average_speed_kmh" >= 0) OR ("traffic_lane_observations"."flow_vehicles_per_hour" IS NOT NULL AND "traffic_lane_observations"."flow_vehicles_per_hour" >= 0))
);
--> statement-breakpoint
ALTER TABLE "traffic_lane_observations" ADD CONSTRAINT "traffic_lane_observations_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "traffic_lane_observations_asset_time_idx" ON "traffic_lane_observations" USING btree ("asset_id","measured_at");