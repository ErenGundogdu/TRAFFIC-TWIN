import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  geometry,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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

export const trafficObservations = pgTable(
  "traffic_observations",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    averageSpeedKmh: doublePrecision("average_speed_kmh"),
    flowVehiclesPerHour: doublePrecision("flow_vehicles_per_hour"),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_observations_pk",
      columns: [table.assetId, table.direction, table.measuredAt],
    }),
    index("traffic_observations_asset_time_idx").on(
      table.assetId,
      table.measuredAt,
    ),
    check(
      "traffic_observations_direction_check",
      sql`${table.direction} IN (1, 2)`,
    ),
    check(
      "traffic_observations_value_check",
      sql`(${table.averageSpeedKmh} IS NOT NULL AND ${table.averageSpeedKmh} >= 0) OR (${table.flowVehiclesPerHour} IS NOT NULL AND ${table.flowVehiclesPerHour} >= 0)`,
    ),
  ],
);

export const operatorNotes = pgTable(
  "operator_notes",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "restrict" }),
    author: text("author").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("operator_notes_asset_created_idx").on(
      table.assetId,
      table.createdAt,
    ),
    check(
      "operator_notes_author_length_check",
      sql`char_length(${table.author}) BETWEEN 2 AND 80`,
    ),
    check(
      "operator_notes_content_length_check",
      sql`char_length(${table.content}) BETWEEN 3 AND 1000`,
    ),
  ],
);
