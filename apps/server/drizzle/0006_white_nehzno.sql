CREATE TYPE "public"."anomaly_confidence" AS ENUM('INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."anomaly_metric" AS ENUM('average-speed-kmh', 'flow-vehicles-per-hour');--> statement-breakpoint
CREATE TYPE "public"."anomaly_status" AS ENUM('INSUFFICIENT_DATA', 'NORMAL', 'CANDIDATE', 'ACTIVE');--> statement-breakpoint
CREATE TABLE "anomaly_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"coverage_area_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"direction" integer NOT NULL,
	"metric" "anomaly_metric" NOT NULL,
	"status" "anomaly_status" NOT NULL,
	"confidence" "anomaly_confidence" NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"current_value" double precision NOT NULL,
	"expected_median" double precision,
	"median_absolute_deviation" double precision,
	"expected_lower_bound" double precision,
	"expected_upper_bound" double precision,
	"absolute_deviation" double precision,
	"sample_count" integer NOT NULL,
	"consecutive_deviations" integer NOT NULL,
	"policy_version" text NOT NULL,
	"baseline_window_weeks" integer NOT NULL,
	"baseline_start" timestamp with time zone NOT NULL,
	"baseline_end" timestamp with time zone NOT NULL,
	"baseline_samples" jsonb NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"local_time_zone" text NOT NULL,
	"local_weekday" integer NOT NULL,
	"local_hour" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anomaly_evaluations_direction_check" CHECK ("anomaly_evaluations"."direction" IN (1, 2)),
	CONSTRAINT "anomaly_evaluations_values_check" CHECK ("anomaly_evaluations"."current_value" >= 0 AND "anomaly_evaluations"."sample_count" >= 0 AND "anomaly_evaluations"."consecutive_deviations" >= 0),
	CONSTRAINT "anomaly_evaluations_local_slot_check" CHECK ("anomaly_evaluations"."local_weekday" BETWEEN 1 AND 7 AND "anomaly_evaluations"."local_hour" BETWEEN 0 AND 23)
);
--> statement-breakpoint
ALTER TABLE "anomaly_evaluations" ADD CONSTRAINT "anomaly_evaluations_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_evaluations" ADD CONSTRAINT "anomaly_evaluations_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "anomaly_evaluations_observation_uidx" ON "anomaly_evaluations" USING btree ("asset_id","direction","metric","observed_at","policy_version");--> statement-breakpoint
CREATE INDEX "anomaly_evaluations_coverage_status_idx" ON "anomaly_evaluations" USING btree ("coverage_area_id","status","observed_at");--> statement-breakpoint
CREATE INDEX "anomaly_evaluations_asset_time_idx" ON "anomaly_evaluations" USING btree ("asset_id","observed_at");