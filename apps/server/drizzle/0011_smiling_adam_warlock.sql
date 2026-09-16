CREATE TYPE "public"."traffic_event_direction" AS ENUM('BOTH', 'POSITIVE', 'NEGATIVE', 'UNKNOWN');--> statement-breakpoint
ALTER TABLE "traffic_events" ADD COLUMN "effects" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "traffic_events" ADD COLUMN "direction" "traffic_event_direction" DEFAULT 'UNKNOWN' NOT NULL;--> statement-breakpoint
ALTER TABLE "traffic_events" ADD COLUMN "direction_description" text;--> statement-breakpoint
ALTER TABLE "traffic_events" ADD COLUMN "sender" text;