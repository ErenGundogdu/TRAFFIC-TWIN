CREATE TABLE "traffic_statistics_import_chunks" (
	"asset_id" text NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"direction" integer NOT NULL,
	"volume_row_count" integer NOT NULL,
	"speed_row_count" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_statistics_import_chunks_pk" PRIMARY KEY("asset_id","resolution","from_date","to_date","direction"),
	CONSTRAINT "traffic_statistics_import_chunks_values_check" CHECK ("traffic_statistics_import_chunks"."resolution" IN ('hour', 'day') AND "traffic_statistics_import_chunks"."from_date" <= "traffic_statistics_import_chunks"."to_date" AND "traffic_statistics_import_chunks"."direction" IN (1, 2) AND "traffic_statistics_import_chunks"."volume_row_count" >= 0 AND "traffic_statistics_import_chunks"."speed_row_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "traffic_statistics_import_chunks" ADD CONSTRAINT "traffic_statistics_import_chunks_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;