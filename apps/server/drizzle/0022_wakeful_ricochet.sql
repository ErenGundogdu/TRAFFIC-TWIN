CREATE TABLE "traffic_speed_statistics" (
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"average_speed_kmh" double precision NOT NULL,
	"detected_vehicle_count" integer NOT NULL,
	"source_report" text DEFAULT 'keskinopeus' NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_speed_statistics_pk" PRIMARY KEY("asset_id","direction","resolution","bucket_start"),
	CONSTRAINT "traffic_speed_statistics_values_check" CHECK ("traffic_speed_statistics"."direction" IN (1, 2) AND "traffic_speed_statistics"."resolution" IN ('hour', 'day') AND "traffic_speed_statistics"."average_speed_kmh" >= 0 AND "traffic_speed_statistics"."detected_vehicle_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "traffic_volume_statistics" (
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"vehicle_count" integer NOT NULL,
	"source_report" text DEFAULT 'liikennemaara' NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_volume_statistics_pk" PRIMARY KEY("asset_id","direction","resolution","bucket_start"),
	CONSTRAINT "traffic_volume_statistics_values_check" CHECK ("traffic_volume_statistics"."direction" IN (1, 2) AND "traffic_volume_statistics"."resolution" IN ('hour', 'day') AND "traffic_volume_statistics"."vehicle_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "traffic_speed_statistics" ADD CONSTRAINT "traffic_speed_statistics_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_volume_statistics" ADD CONSTRAINT "traffic_volume_statistics_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "traffic_speed_statistics_query_idx" ON "traffic_speed_statistics" USING btree ("asset_id","resolution","direction","bucket_start");--> statement-breakpoint
CREATE INDEX "traffic_volume_statistics_query_idx" ON "traffic_volume_statistics" USING btree ("asset_id","resolution","direction","bucket_start");