import { sql } from "drizzle-orm";
import {
  boolean,
  bigint,
  check,
  date,
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

export const artifactStatus = pgEnum("artifact_status", [
  "DOWNLOADED",
  "PROCESSED",
  "FAILED",
]);

export const aggregateResolution = pgEnum("aggregate_resolution", [
  "minute",
  "hour",
  "day",
]);

export const junctionCoverage = pgEnum("junction_coverage", [
  "FULL",
  "PARTIAL",
  "INSUFFICIENT",
]);

export const junctionMatchConfidence = pgEnum("junction_match_confidence", [
  "HIGH",
  "MEDIUM",
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

export const ingestionArtifacts = pgTable(
  "ingestion_artifacts",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "restrict" }),
    sourceDate: date("source_date", { mode: "string" }).notNull(),
    sourceUrl: text("source_url").notNull(),
    storagePath: text("storage_path").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    status: artifactStatus("status").notNull(),
    processorVersion: text("processor_version").notNull(),
    recordCount: integer("record_count").notNull().default(0),
    validRecordCount: integer("valid_record_count").notNull().default(0),
    errorMessage: text("error_message"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("ingestion_artifacts_asset_date_uidx").on(
      table.provider,
      table.assetId,
      table.sourceDate,
    ),
    index("ingestion_artifacts_asset_date_idx").on(
      table.assetId,
      table.sourceDate,
    ),
    check(
      "ingestion_artifacts_checksum_check",
      sql`char_length(${table.checksumSha256}) = 64`,
    ),
  ],
);

export const trafficAggregates = pgTable(
  "traffic_aggregates",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    resolution: aggregateResolution("resolution").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    averageSpeedKmh: doublePrecision("average_speed_kmh").notNull(),
    vehicleCount: integer("vehicle_count").notNull(),
    sampleCount: integer("sample_count").notNull(),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => ingestionArtifacts.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_aggregates_pk",
      columns: [
        table.assetId,
        table.direction,
        table.resolution,
        table.bucketStart,
      ],
    }),
    index("traffic_aggregates_query_idx").on(
      table.assetId,
      table.resolution,
      table.direction,
      table.bucketStart,
    ),
    check(
      "traffic_aggregates_direction_check",
      sql`${table.direction} IN (1, 2)`,
    ),
    check(
      "traffic_aggregates_values_check",
      sql`${table.averageSpeedKmh} >= 0 AND ${table.vehicleCount} >= 0 AND ${table.sampleCount} >= 0`,
    ),
  ],
);

export const derivedJunctions = pgTable(
  "derived_junctions",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "cascade" }),
    osmRelationId: text("osm_relation_id").notNull(),
    name: text("name").notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    roadRefs: text("road_refs").array().notNull(),
    coverage: junctionCoverage("coverage").notNull(),
    policyVersion: text("policy_version").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
    }).notNull(),
    sourceFetchedAt: timestamp("source_fetched_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("derived_junctions_coverage_osm_uidx").on(
      table.coverageAreaId,
      table.osmRelationId,
    ),
    index("derived_junctions_location_gix").using("gist", table.location),
  ],
);

export const junctionSensorMatches = pgTable(
  "junction_sensor_matches",
  {
    junctionId: text("junction_id")
      .notNull()
      .references(() => derivedJunctions.id, { onDelete: "cascade" }),
    stationAssetId: text("station_asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    roadRef: text("road_ref").notNull(),
    distanceMeters: doublePrecision("distance_meters").notNull(),
    bearingDifferenceDegrees: doublePrecision("bearing_difference_degrees"),
    confidence: junctionMatchConfidence("confidence").notNull(),
    policyVersion: text("policy_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "junction_sensor_matches_pk",
      columns: [table.junctionId, table.stationAssetId],
    }),
    index("junction_sensor_matches_station_idx").on(table.stationAssetId),
    check(
      "junction_sensor_matches_distance_check",
      sql`${table.distanceMeters} >= 0`,
    ),
    check(
      "junction_sensor_matches_bearing_check",
      sql`${table.bearingDifferenceDegrees} IS NULL OR ${table.bearingDifferenceDegrees} BETWEEN 0 AND 90`,
    ),
  ],
);
