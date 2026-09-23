CREATE TYPE "public"."aggregate_coverage_status" AS ENUM('AVAILABLE', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "history_aggregate_coverage" (
	"asset_id" text NOT NULL,
	"source_date" date NOT NULL,
	"resolution" "aggregate_resolution" NOT NULL,
	"status" "aggregate_coverage_status" NOT NULL,
	"bucket_count" integer NOT NULL,
	"first_bucket_at" timestamp with time zone,
	"last_bucket_at" timestamp with time zone,
	"artifact_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "history_aggregate_coverage_pk" PRIMARY KEY("asset_id","source_date","resolution"),
	CONSTRAINT "history_aggregate_coverage_values_check" CHECK (("history_aggregate_coverage"."status" = 'AVAILABLE' AND "history_aggregate_coverage"."bucket_count" > 0 AND "history_aggregate_coverage"."first_bucket_at" IS NOT NULL AND "history_aggregate_coverage"."last_bucket_at" IS NOT NULL) OR ("history_aggregate_coverage"."status" = 'EXPIRED' AND "history_aggregate_coverage"."bucket_count" = 0 AND "history_aggregate_coverage"."first_bucket_at" IS NULL AND "history_aggregate_coverage"."last_bucket_at" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "history_aggregate_coverage" ADD CONSTRAINT "history_aggregate_coverage_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_aggregate_coverage" ADD CONSTRAINT "history_aggregate_coverage_artifact_id_ingestion_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."ingestion_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "history_aggregate_coverage" ("asset_id", "source_date", "resolution", "status", "bucket_count", "first_bucket_at", "last_bucket_at", "artifact_id", "updated_at")
SELECT a."asset_id", a."source_date", t."resolution", 'AVAILABLE', count(*)::integer, min(t."bucket_start"), max(t."bucket_start"), a."id", now()
FROM "ingestion_artifacts" a
INNER JOIN "traffic_aggregates" t ON t."artifact_id" = a."id"
WHERE a."status" = 'PROCESSED'
GROUP BY a."asset_id", a."source_date", t."resolution", a."id";--> statement-breakpoint
INSERT INTO "history_aggregate_coverage" ("asset_id", "source_date", "resolution", "status", "bucket_count", "first_bucket_at", "last_bucket_at", "artifact_id", "updated_at")
SELECT a."asset_id", a."source_date", 'minute', 'EXPIRED', 0, NULL, NULL, a."id", now()
FROM "ingestion_artifacts" a
WHERE a."status" = 'PROCESSED'
	AND a."valid_record_count" > 0
	AND NOT EXISTS (
		SELECT 1 FROM "history_aggregate_coverage" c
		WHERE c."artifact_id" = a."id" AND c."resolution" = 'minute'
	);--> statement-breakpoint
CREATE INDEX "history_aggregate_coverage_query_idx" ON "history_aggregate_coverage" USING btree ("asset_id","resolution","status","source_date");
