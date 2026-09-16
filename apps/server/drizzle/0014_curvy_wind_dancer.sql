ALTER TABLE "operator_notes" ADD COLUMN "category" text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "operator_notes" ADD COLUMN "status" text DEFAULT 'INFORMATIONAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "operator_notes" ADD CONSTRAINT "operator_notes_category_check" CHECK ("operator_notes"."category" IN ('GENERAL', 'MAINTENANCE', 'FAULT', 'INSPECTION'));--> statement-breakpoint
ALTER TABLE "operator_notes" ADD CONSTRAINT "operator_notes_status_check" CHECK ("operator_notes"."status" IN ('INFORMATIONAL', 'ACTION_REQUIRED', 'RESOLVED'));