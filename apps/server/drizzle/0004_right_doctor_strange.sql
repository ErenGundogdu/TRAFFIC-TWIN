CREATE TYPE "public"."aggregate_resolution" AS ENUM('minute', 'hour', 'day');--> statement-breakpoint
CREATE TYPE "public"."artifact_status" AS ENUM('DOWNLOADED', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "ingestion_artifacts" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"asset_id" text NOT NULL,
	"source_date" date NOT NULL,
	"source_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"status" "artifact_status" NOT NULL,
	"processor_version" text NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"valid_record_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingestion_artifacts_checksum_check" CHECK (char_length("ingestion_artifacts"."checksum_sha256") = 64)
);
--> statement-breakpoint
CREATE TABLE "traffic_aggregates" (
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"bucket_start" timestamp with time zone NOT NULL,
	"average_speed_kmh" double precision NOT NULL,
	"vehicle_count" integer NOT NULL,
	"sample_count" integer NOT NULL,
	"artifact_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traffic_aggregates_pk" PRIMARY KEY("asset_id","direction","resolution","bucket_start"),
	CONSTRAINT "traffic_aggregates_direction_check" CHECK ("traffic_aggregates"."direction" IN (1, 2)),
	CONSTRAINT "traffic_aggregates_values_check" CHECK ("traffic_aggregates"."average_speed_kmh" >= 0 AND "traffic_aggregates"."vehicle_count" >= 0 AND "traffic_aggregates"."sample_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ingestion_artifacts" ADD CONSTRAINT "ingestion_artifacts_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_aggregates" ADD CONSTRAINT "traffic_aggregates_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traffic_aggregates" ADD CONSTRAINT "traffic_aggregates_artifact_id_ingestion_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."ingestion_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingestion_artifacts_asset_date_uidx" ON "ingestion_artifacts" USING btree ("provider","asset_id","source_date");--> statement-breakpoint
CREATE INDEX "ingestion_artifacts_asset_date_idx" ON "ingestion_artifacts" USING btree ("asset_id","source_date");--> statement-breakpoint
CREATE INDEX "traffic_aggregates_query_idx" ON "traffic_aggregates" USING btree ("asset_id","resolution","direction","bucket_start");