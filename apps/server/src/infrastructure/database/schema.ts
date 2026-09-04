import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  geometry,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const trafficAssetKind = pgEnum("traffic_asset_kind", [
  "sensor-station",
  "junction",
  "road-segment",
  "corridor",
  "traffic-zone",
]);

export const coverageAreas = pgTable("coverage_areas", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timeZone: text("time_zone").notNull(),
  minLongitude: doublePrecision("min_longitude").notNull(),
  minLatitude: doublePrecision("min_latitude").notNull(),
  maxLongitude: doublePrecision("max_longitude").notNull(),
  maxLatitude: doublePrecision("max_latitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trafficAssets = pgTable(
  "traffic_assets",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerStationId: integer("provider_station_id").notNull(),
    tmsNumber: integer("tms_number").notNull(),
    kind: trafficAssetKind("kind").notNull(),
    name: text("name").notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    bearing: doublePrecision("bearing"),
    collecting: boolean("collecting").notNull(),
    capabilities: text("capabilities")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("traffic_assets_provider_station_uidx").on(
      table.provider,
      table.providerStationId,
    ),
    index("traffic_assets_coverage_area_idx").on(table.coverageAreaId),
    index("traffic_assets_location_gix").using("gist", table.location),
  ],
);
