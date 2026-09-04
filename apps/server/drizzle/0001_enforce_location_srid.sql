UPDATE "traffic_assets"
SET "location" = ST_SetSRID("location", 4326)
WHERE ST_SRID("location") = 0;--> statement-breakpoint
ALTER TABLE "traffic_assets"
ALTER COLUMN "location"
TYPE geometry(Point, 4326)
USING ST_Force2D(ST_SetSRID("location", 4326));
