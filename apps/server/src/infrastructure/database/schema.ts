import { sql } from "drizzle-orm";
import type {
  RoadSegment,
  TrafficCompositionBreakdown,
  TrafficEventGeometry,
} from "@traffic-twin/contracts";
import {
  boolean,
  bigint,
  check,
  date,
  doublePrecision,
  geometry,
  index,
  integer,
  jsonb,
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

export const rawFileStatus = pgEnum("raw_file_status", [
  "RETAINED",
  "PURGED",
  "MISSING",
]);

export const historyImportJobStatus = pgEnum("history_import_job_status", [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "PARTIAL_FAILURE",
  "FAILED",
]);

export const historyImportJobPurpose = pgEnum("history_import_job_purpose", [
  "INTERACTIVE",
  "ROLLING_COVERAGE",
]);

export const aggregateResolution = pgEnum("aggregate_resolution", [
  "minute",
  "hour",
  "day",
]);

export const aggregateCoverageStatus = pgEnum("aggregate_coverage_status", [
  "AVAILABLE",
  "EXPIRED",
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

export const anomalyMetric = pgEnum("anomaly_metric", [
  "average-speed-kmh",
  "flow-vehicles-per-hour",
]);

export const anomalyStatus = pgEnum("anomaly_status", [
  "INSUFFICIENT_DATA",
  "NORMAL",
  "CANDIDATE",
  "ACTIVE",
]);

export const anomalyConfidence = pgEnum("anomaly_confidence", [
  "INSUFFICIENT",
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const trafficEventCategory = pgEnum("traffic_event_category", [
  "TRAFFIC_ANNOUNCEMENT",
  "ROAD_WORK",
]);

export const trafficEventStatus = pgEnum("traffic_event_status", [
  "UPCOMING",
  "ACTIVE",
  "ENDED",
]);

export const trafficEventSeverity = pgEnum("traffic_event_severity", [
  "UNKNOWN",
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const trafficEventDirection = pgEnum("traffic_event_direction", [
  "BOTH",
  "POSITIVE",
  "NEGATIVE",
  "UNKNOWN",
]);

export const roadContextStatus = pgEnum("road_context_status", [
  "MATCHED",
  "NO_MATCH",
]);

export const fieldReportCategory = pgEnum("field_report_category", [
  "ACCIDENT",
  "CONGESTION",
  "ROAD_HAZARD",
  "ROAD_DAMAGE",
  "SIGNAL_FAILURE",
  "SENSOR_ISSUE",
  "OTHER",
]);

export const fieldReportSeverity = pgEnum("field_report_severity", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const fieldReportStatus = pgEnum("field_report_status", [
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
  "RESOLVED",
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
    speedPercentOfFreeFlow: doublePrecision("speed_percent_of_free_flow"),
    flowPercentOfCapacity: doublePrecision("flow_percent_of_capacity"),
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

export const trafficLaneObservations = pgTable(
  "traffic_lane_observations",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    lane: integer("lane").notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    averageSpeedKmh: doublePrecision("average_speed_kmh"),
    flowVehiclesPerHour: doublePrecision("flow_vehicles_per_hour"),
    flowWindow: text("flow_window"),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_lane_observations_pk",
      columns: [table.assetId, table.lane, table.measuredAt],
    }),
    index("traffic_lane_observations_asset_time_idx").on(
      table.assetId,
      table.measuredAt,
    ),
    check("traffic_lane_observations_lane_check", sql`${table.lane} > 0`),
    check(
      "traffic_lane_observations_flow_window_check",
      sql`${table.flowWindow} IS NULL OR ${table.flowWindow} IN ('ROLLING_5_MINUTES', 'FIXED_5_MINUTES')`,
    ),
    check(
      "traffic_lane_observations_value_check",
      sql`(${table.averageSpeedKmh} IS NOT NULL AND ${table.averageSpeedKmh} >= 0) OR (${table.flowVehiclesPerHour} IS NOT NULL AND ${table.flowVehiclesPerHour} >= 0)`,
    ),
  ],
);

export const trafficDirectionProfiles = pgTable(
  "traffic_direction_profiles",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    freeFlowSpeedKmh: doublePrecision("free_flow_speed_kmh"),
    maximumFlowVehiclesPerHour: doublePrecision(
      "maximum_flow_vehicles_per_hour",
    ),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_direction_profiles_pk",
      columns: [table.assetId, table.direction],
    }),
    check(
      "traffic_direction_profiles_direction_check",
      sql`${table.direction} IN (1, 2)`,
    ),
    check(
      "traffic_direction_profiles_values_check",
      sql`(${table.freeFlowSpeedKmh} IS NULL OR ${table.freeFlowSpeedKmh} > 0) AND (${table.maximumFlowVehiclesPerHour} IS NULL OR ${table.maximumFlowVehiclesPerHour} > 0)`,
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
    category: text("category").default("GENERAL").notNull(),
    status: text("status").default("INFORMATIONAL").notNull(),
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
    check(
      "operator_notes_category_check",
      sql`${table.category} IN ('GENERAL', 'MAINTENANCE', 'FAULT', 'INSPECTION')`,
    ),
    check(
      "operator_notes_status_check",
      sql`${table.status} IN ('INFORMATIONAL', 'ACTION_REQUIRED', 'RESOLVED')`,
    ),
  ],
);

export const fieldReports = pgTable(
  "field_reports",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "restrict" }),
    source: text("source").default("OPERATOR").notNull(),
    author: text("author").notNull(),
    category: fieldReportCategory("category").notNull(),
    severity: fieldReportSeverity("severity").notNull(),
    status: fieldReportStatus("status").default("PENDING_REVIEW").notNull(),
    description: text("description").notNull(),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("field_reports_coverage_status_created_idx").on(
      table.coverageAreaId,
      table.status,
      table.createdAt,
    ),
    index("field_reports_location_gix").using("gist", table.location),
    check("field_reports_source_check", sql`${table.source} = 'OPERATOR'`),
    check(
      "field_reports_author_length_check",
      sql`char_length(${table.author}) BETWEEN 2 AND 80`,
    ),
    check(
      "field_reports_description_length_check",
      sql`char_length(${table.description}) BETWEEN 3 AND 1000`,
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
    rawFileStatus: rawFileStatus("raw_file_status")
      .default("RETAINED")
      .notNull(),
    rawFilePurgedAt: timestamp("raw_file_purged_at", { withTimezone: true }),
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

export const historyImportJobs = pgTable(
  "history_import_jobs",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "restrict" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "restrict" }),
    fromDate: date("from_date", { mode: "string" }).notNull(),
    toDate: date("to_date", { mode: "string" }).notNull(),
    requestedDayCount: integer("requested_day_count").notNull(),
    targetDayCount: integer("target_day_count").notNull(),
    sourceDates: jsonb("source_dates").$type<string[]>().notNull(),
    completedDayCount: integer("completed_day_count").default(0).notNull(),
    successfulDayCount: integer("successful_day_count").default(0).notNull(),
    failedDayCount: integer("failed_day_count").default(0).notNull(),
    skippedDayCount: integer("skipped_day_count").default(0).notNull(),
    currentSourceDate: date("current_source_date", { mode: "string" }),
    status: historyImportJobStatus("status").default("QUEUED").notNull(),
    purpose: historyImportJobPurpose("purpose")
      .default("INTERACTIVE")
      .notNull(),
    priority: integer("priority").default(100).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("history_import_jobs_status_priority_created_idx").on(
      table.status,
      table.priority,
      table.createdAt,
    ),
    uniqueIndex("history_import_jobs_active_range_uidx")
      .on(table.coverageAreaId, table.assetId, table.fromDate, table.toDate)
      .where(sql`${table.status} IN ('QUEUED', 'RUNNING')`),
    check(
      "history_import_jobs_range_check",
      sql`${table.fromDate} <= ${table.toDate}`,
    ),
    check(
      "history_import_jobs_counts_check",
      sql`${table.requestedDayCount} >= ${table.targetDayCount} AND ${table.targetDayCount} > 0 AND ${table.completedDayCount} >= 0 AND ${table.successfulDayCount} >= 0 AND ${table.failedDayCount} >= 0 AND ${table.skippedDayCount} >= 0 AND ${table.completedDayCount} = ${table.successfulDayCount} + ${table.failedDayCount} + ${table.skippedDayCount} AND ${table.completedDayCount} <= ${table.targetDayCount}`,
    ),
    check(
      "history_import_jobs_source_dates_check",
      sql`jsonb_typeof(${table.sourceDates}) = 'array' AND jsonb_array_length(${table.sourceDates}) = ${table.targetDayCount}`,
    ),
    check(
      "history_import_jobs_priority_check",
      sql`${table.priority} BETWEEN 0 AND 100`,
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
    vehicleClassBreakdown: jsonb("vehicle_class_breakdown")
      .$type<TrafficCompositionBreakdown>()
      .default({})
      .notNull(),
    laneBreakdown: jsonb("lane_breakdown")
      .$type<TrafficCompositionBreakdown>()
      .default({})
      .notNull(),
    laneVehicleClassBreakdown: jsonb("lane_vehicle_class_breakdown")
      .$type<TrafficCompositionBreakdown>()
      .default({})
      .notNull(),
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
    check(
      "traffic_aggregates_composition_objects_check",
      sql`jsonb_typeof(${table.vehicleClassBreakdown}) = 'object' AND jsonb_typeof(${table.laneBreakdown}) = 'object' AND jsonb_typeof(${table.laneVehicleClassBreakdown}) = 'object'`,
    ),
  ],
);

export const trafficVolumeStatistics = pgTable(
  "traffic_volume_statistics",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    resolution: aggregateResolution("resolution").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    vehicleCount: integer("vehicle_count").notNull(),
    sourceReport: text("source_report").default("liikennemaara").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_volume_statistics_pk",
      columns: [
        table.assetId,
        table.direction,
        table.resolution,
        table.bucketStart,
      ],
    }),
    index("traffic_volume_statistics_query_idx").on(
      table.assetId,
      table.resolution,
      table.direction,
      table.bucketStart,
    ),
    check(
      "traffic_volume_statistics_values_check",
      sql`${table.direction} IN (1, 2) AND ${table.resolution} IN ('hour', 'day') AND ${table.vehicleCount} >= 0`,
    ),
  ],
);

export const trafficSpeedStatistics = pgTable(
  "traffic_speed_statistics",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    resolution: aggregateResolution("resolution").notNull(),
    bucketStart: timestamp("bucket_start", { withTimezone: true }).notNull(),
    averageSpeedKmh: doublePrecision("average_speed_kmh").notNull(),
    detectedVehicleCount: integer("detected_vehicle_count").notNull(),
    sourceReport: text("source_report").default("keskinopeus").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_speed_statistics_pk",
      columns: [
        table.assetId,
        table.direction,
        table.resolution,
        table.bucketStart,
      ],
    }),
    index("traffic_speed_statistics_query_idx").on(
      table.assetId,
      table.resolution,
      table.direction,
      table.bucketStart,
    ),
    check(
      "traffic_speed_statistics_values_check",
      sql`${table.direction} IN (1, 2) AND ${table.resolution} IN ('hour', 'day') AND ${table.averageSpeedKmh} >= 0 AND ${table.detectedVehicleCount} >= 0`,
    ),
  ],
);

export const trafficStatisticsImportChunks = pgTable(
  "traffic_statistics_import_chunks",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    resolution: aggregateResolution("resolution").notNull(),
    fromDate: date("from_date", { mode: "string" }).notNull(),
    toDate: date("to_date", { mode: "string" }).notNull(),
    direction: integer("direction").notNull(),
    volumeRowCount: integer("volume_row_count").notNull(),
    speedRowCount: integer("speed_row_count").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_statistics_import_chunks_pk",
      columns: [
        table.assetId,
        table.resolution,
        table.fromDate,
        table.toDate,
        table.direction,
      ],
    }),
    check(
      "traffic_statistics_import_chunks_values_check",
      sql`${table.resolution} IN ('hour', 'day') AND ${table.fromDate} <= ${table.toDate} AND ${table.direction} IN (1, 2) AND ${table.volumeRowCount} >= 0 AND ${table.speedRowCount} >= 0`,
    ),
  ],
);

export const trafficStatisticsImportFailures = pgTable(
  "traffic_statistics_import_failures",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    resolution: aggregateResolution("resolution").notNull(),
    direction: integer("direction").notNull(),
    metric: text("metric").notNull(),
    fromDate: date("from_date", { mode: "string" }).notNull(),
    toDate: date("to_date", { mode: "string" }).notNull(),
    errorCode: text("error_code").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "traffic_statistics_import_failures_pk",
      columns: [
        table.assetId,
        table.resolution,
        table.direction,
        table.metric,
        table.fromDate,
        table.toDate,
      ],
    }),
    check(
      "traffic_statistics_import_failures_values_check",
      sql`${table.resolution} IN ('hour', 'day') AND ${table.direction} IN (1, 2) AND ${table.metric} IN ('volume', 'speed') AND ${table.fromDate} <= ${table.toDate} AND ${table.errorCode} IN ('SOURCE_CALCULATION', 'UPSTREAM_UNAVAILABLE')`,
    ),
  ],
);

export const historyAggregateCoverage = pgTable(
  "history_aggregate_coverage",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    sourceDate: date("source_date", { mode: "string" }).notNull(),
    resolution: aggregateResolution("resolution").notNull(),
    status: aggregateCoverageStatus("status").notNull(),
    bucketCount: integer("bucket_count").notNull(),
    firstBucketAt: timestamp("first_bucket_at", { withTimezone: true }),
    lastBucketAt: timestamp("last_bucket_at", { withTimezone: true }),
    artifactId: text("artifact_id")
      .notNull()
      .references(() => ingestionArtifacts.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      name: "history_aggregate_coverage_pk",
      columns: [table.assetId, table.sourceDate, table.resolution],
    }),
    index("history_aggregate_coverage_query_idx").on(
      table.assetId,
      table.resolution,
      table.status,
      table.sourceDate,
    ),
    check(
      "history_aggregate_coverage_values_check",
      sql`(${table.status} = 'AVAILABLE' AND ${table.bucketCount} > 0 AND ${table.firstBucketAt} IS NOT NULL AND ${table.lastBucketAt} IS NOT NULL) OR (${table.status} = 'EXPIRED' AND ${table.bucketCount} = 0 AND ${table.firstBucketAt} IS NULL AND ${table.lastBucketAt} IS NULL)`,
    ),
  ],
);

export const anomalyEvaluations = pgTable(
  "anomaly_evaluations",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => trafficAssets.id, { onDelete: "cascade" }),
    direction: integer("direction").notNull(),
    metric: anomalyMetric("metric").notNull(),
    status: anomalyStatus("status").notNull(),
    confidence: anomalyConfidence("confidence").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    currentValue: doublePrecision("current_value").notNull(),
    expectedMedian: doublePrecision("expected_median"),
    medianAbsoluteDeviation: doublePrecision("median_absolute_deviation"),
    expectedLowerBound: doublePrecision("expected_lower_bound"),
    expectedUpperBound: doublePrecision("expected_upper_bound"),
    absoluteDeviation: doublePrecision("absolute_deviation"),
    sampleCount: integer("sample_count").notNull(),
    consecutiveDeviations: integer("consecutive_deviations").notNull(),
    policyVersion: text("policy_version").notNull(),
    baselineWindowWeeks: integer("baseline_window_weeks").notNull(),
    baselineStart: timestamp("baseline_start", {
      withTimezone: true,
    }).notNull(),
    baselineEnd: timestamp("baseline_end", { withTimezone: true }).notNull(),
    baselineSamples: jsonb("baseline_samples")
      .$type<Array<{ timestamp: string; value: number }>>()
      .notNull(),
    policySnapshot: jsonb("policy_snapshot")
      .$type<{
        version: string;
        windowWeeks: number;
        minimumSamples: number;
        persistenceCount: number;
        maximumPersistenceGapMinutes: number;
        madMultiplier: number;
        minimumAbsoluteDeviation: Record<string, number>;
      }>()
      .notNull(),
    localTimeZone: text("local_time_zone").notNull(),
    localWeekday: integer("local_weekday").notNull(),
    localHour: integer("local_hour").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("anomaly_evaluations_observation_uidx").on(
      table.assetId,
      table.direction,
      table.metric,
      table.policyVersion,
    ),
    index("anomaly_evaluations_coverage_status_idx").on(
      table.coverageAreaId,
      table.status,
      table.observedAt,
    ),
    index("anomaly_evaluations_asset_time_idx").on(
      table.assetId,
      table.observedAt,
    ),
    check(
      "anomaly_evaluations_direction_check",
      sql`${table.direction} IN (1, 2)`,
    ),
    check(
      "anomaly_evaluations_values_check",
      sql`${table.currentValue} >= 0 AND ${table.sampleCount} >= 0 AND ${table.consecutiveDeviations} >= 0`,
    ),
    check(
      "anomaly_evaluations_local_slot_check",
      sql`${table.localWeekday} BETWEEN 1 AND 7 AND ${table.localHour} BETWEEN 0 AND 23`,
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

export const stationRoadContexts = pgTable("station_road_contexts", {
  assetId: text("asset_id")
    .primaryKey()
    .references(() => trafficAssets.id, { onDelete: "cascade" }),
  status: roadContextStatus("status").notNull(),
  roadRef: text("road_ref"),
  matchingPolicy: text("matching_policy").notNull(),
  sourceUpdatedAt: timestamp("source_updated_at", {
    withTimezone: true,
  }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  segments: jsonb("segments").$type<RoadSegment[]>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const trafficEventSyncs = pgTable("traffic_event_syncs", {
  coverageAreaId: text("coverage_area_id")
    .primaryKey()
    .references(() => coverageAreas.id, { onDelete: "cascade" }),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

export const trafficEvents = pgTable(
  "traffic_events",
  {
    id: text("id").primaryKey(),
    coverageAreaId: text("coverage_area_id")
      .notNull()
      .references(() => coverageAreas.id, { onDelete: "cascade" }),
    providerEventId: text("provider_event_id").notNull(),
    category: trafficEventCategory("category").notNull(),
    status: trafficEventStatus("status").notNull(),
    severity: trafficEventSeverity("severity").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    comment: text("comment"),
    effects: text("effects")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    direction: trafficEventDirection("direction").notNull().default("UNKNOWN"),
    directionDescription: text("direction_description"),
    sender: text("sender"),
    language: text("language").notNull(),
    geometry: jsonb("geometry").$type<TrafficEventGeometry>().notNull(),
    roadNumbers: integer("road_numbers").array().notNull(),
    releaseTime: timestamp("release_time", { withTimezone: true }).notNull(),
    versionTime: timestamp("version_time", { withTimezone: true }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("traffic_events_provider_event_uidx").on(
      table.coverageAreaId,
      table.providerEventId,
    ),
    index("traffic_events_coverage_status_idx").on(
      table.coverageAreaId,
      table.status,
      table.startsAt,
    ),
    index("traffic_events_geometry_geography_gix").using(
      "gist",
      sql`(ST_SetSRID(ST_GeomFromGeoJSON(${table.geometry}::text), 4326)::geography)`,
    ),
  ],
);
