ALTER TABLE "anomaly_evaluations" RENAME TO "anomaly_evaluation_history";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_pkey" RENAME TO "anomaly_evaluation_history_pkey";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_observation_uidx" RENAME TO "anomaly_evaluation_history_observation_uidx";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_coverage_status_idx" RENAME TO "anomaly_evaluation_history_coverage_status_idx";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_asset_time_idx" RENAME TO "anomaly_evaluation_history_asset_time_idx";--> statement-breakpoint
CREATE TABLE "anomaly_evaluations" (LIKE "anomaly_evaluation_history" INCLUDING ALL);--> statement-breakpoint
ALTER TABLE "anomaly_evaluations" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
DROP INDEX "anomaly_evaluations_asset_id_direction_metric_observed_at_p_idx";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_coverage_area_id_status_observed_at_idx" RENAME TO "anomaly_evaluations_coverage_status_idx";--> statement-breakpoint
ALTER INDEX "anomaly_evaluations_asset_id_observed_at_idx" RENAME TO "anomaly_evaluations_asset_time_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "anomaly_evaluations_observation_uidx" ON "anomaly_evaluations" USING btree ("asset_id","direction","metric","policy_version");--> statement-breakpoint
ALTER TABLE "anomaly_evaluations" ADD CONSTRAINT "anomaly_evaluations_coverage_area_id_coverage_areas_id_fk" FOREIGN KEY ("coverage_area_id") REFERENCES "public"."coverage_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomaly_evaluations" ADD CONSTRAINT "anomaly_evaluations_asset_id_traffic_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."traffic_assets"("id") ON DELETE cascade ON UPDATE no action;
