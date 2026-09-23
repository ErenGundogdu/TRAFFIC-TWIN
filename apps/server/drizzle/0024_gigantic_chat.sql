CREATE TABLE "traffic_statistics_import_failures" (
	"asset_id" text NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"direction" integer NOT NULL,
	"metric" text NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"error_code" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_statistics_import_failures_pk" PRIMARY KEY("asset_id","resolution","direction","metric","from_date","to_date"),
	CONSTRAINT "traffic_statistics_import_failures_values_check" CHECK ("traffic_statistics_import_failures"."resolution" IN ('hour', 'day') AND "traffic_statistics_import_failures"."direction" IN (1, 2) AND "traffic_statistics_import_failures"."metric" IN ('volume', 'speed') AND "traffic_statistics_import_failures"."from_date" <= "traffic_statistics_import_failures"."to_date" AND "traffic_statistics_import_failures"."error_code" IN ('SOURCE_CALCULATION', 'UPSTREAM_UNAVAILABLE'))
);
--> statement-breakpoint
ALTER TABLE "traffic_statistics_import_failures" ADD CONSTRAINT "traffic_statistics_import_failures_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;