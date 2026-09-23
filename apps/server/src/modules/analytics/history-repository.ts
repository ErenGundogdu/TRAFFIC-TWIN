import type {
  HistoryMetric,
  HistorySeries,
  ResolvedHistoryResolution,
} from "@traffic-twin/contracts";
import { and, asc, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  ingestionArtifacts,
  trafficAggregates,
  trafficAssets,
  trafficSpeedStatistics,
  trafficStatisticsImportChunks,
  trafficStatisticsImportFailures,
  trafficVolumeStatistics,
} from "../../infrastructure/database/schema.js";
import type { HistorySummaryRow } from "./history-summary.js";

interface HistoryRowsQuery {
  assetIds: string[];
  direction: 1 | 2;
  resolution: ResolvedHistoryResolution;
  metric: HistoryMetric;
  from: Date;
  to: Date;
}

export class HistoryRepository {
  constructor(private readonly database: Database) {}

  async getSeries(query: HistoryRowsQuery): Promise<HistorySeries[]> {
    const aggregateRows = await this.database
      .select({
        assetId: trafficAggregates.assetId,
        assetName: trafficAssets.name,
        bucketStart: trafficAggregates.bucketStart,
        averageSpeedKmh: trafficAggregates.averageSpeedKmh,
        vehicleCount: trafficAggregates.vehicleCount,
        sampleCount: trafficAggregates.sampleCount,
        vehicleClassBreakdown: trafficAggregates.vehicleClassBreakdown,
        laneBreakdown: trafficAggregates.laneBreakdown,
        laneVehicleClassBreakdown: trafficAggregates.laneVehicleClassBreakdown,
      })
      .from(trafficAggregates)
      .innerJoin(trafficAssets, eq(trafficAssets.id, trafficAggregates.assetId))
      .where(
        and(
          inArray(trafficAggregates.assetId, query.assetIds),
          eq(trafficAggregates.direction, query.direction),
          eq(trafficAggregates.resolution, query.resolution),
          gte(trafficAggregates.bucketStart, query.from),
          lt(trafficAggregates.bucketStart, query.to),
        ),
      )
      .orderBy(asc(trafficAggregates.bucketStart));

    const statisticRows =
      query.resolution === "minute"
        ? []
        : query.metric === "average-speed-kmh"
          ? await this.database
              .select({
                assetId: trafficSpeedStatistics.assetId,
                assetName: trafficAssets.name,
                bucketStart: trafficSpeedStatistics.bucketStart,
                value: trafficSpeedStatistics.averageSpeedKmh,
                sampleCount: trafficSpeedStatistics.detectedVehicleCount,
              })
              .from(trafficSpeedStatistics)
              .innerJoin(
                trafficAssets,
                eq(trafficAssets.id, trafficSpeedStatistics.assetId),
              )
              .where(
                and(
                  inArray(trafficSpeedStatistics.assetId, query.assetIds),
                  eq(trafficSpeedStatistics.direction, query.direction),
                  eq(trafficSpeedStatistics.resolution, query.resolution),
                  gte(trafficSpeedStatistics.bucketStart, query.from),
                  lt(trafficSpeedStatistics.bucketStart, query.to),
                ),
              )
          : await this.database
              .select({
                assetId: trafficVolumeStatistics.assetId,
                assetName: trafficAssets.name,
                bucketStart: trafficVolumeStatistics.bucketStart,
                value: trafficVolumeStatistics.vehicleCount,
                sampleCount: trafficVolumeStatistics.vehicleCount,
              })
              .from(trafficVolumeStatistics)
              .innerJoin(
                trafficAssets,
                eq(trafficAssets.id, trafficVolumeStatistics.assetId),
              )
              .where(
                and(
                  inArray(trafficVolumeStatistics.assetId, query.assetIds),
                  eq(trafficVolumeStatistics.direction, query.direction),
                  eq(trafficVolumeStatistics.resolution, query.resolution),
                  gte(trafficVolumeStatistics.bucketStart, query.from),
                  lt(trafficVolumeStatistics.bucketStart, query.to),
                ),
              );

    return query.assetIds.map((assetId) => {
      const aggregateAssetRows = aggregateRows.filter(
        (row) => row.assetId === assetId,
      );
      const statisticAssetRows = statisticRows.filter(
        (row) => row.assetId === assetId,
      );
      const points = new Map(
        aggregateAssetRows.map((row) => [
          row.bucketStart.toISOString(),
          {
            timestamp: row.bucketStart.toISOString(),
            value:
              query.metric === "average-speed-kmh"
                ? row.averageSpeedKmh
                : row.vehicleCount,
            sampleCount: row.sampleCount,
          },
        ]),
      );
      for (const row of statisticAssetRows) {
        points.set(row.bucketStart.toISOString(), {
          timestamp: row.bucketStart.toISOString(),
          value: row.value,
          sampleCount: row.sampleCount,
        });
      }
      return {
        assetId,
        assetName:
          statisticAssetRows[0]?.assetName ??
          aggregateAssetRows[0]?.assetName ??
          assetId,
        points: [...points.values()].sort((left, right) =>
          left.timestamp.localeCompare(right.timestamp),
        ),
      };
    });
  }

  async getSummaryRows(query: {
    assetIds: string[];
    resolution: ResolvedHistoryResolution;
    from: Date;
    to: Date;
  }): Promise<HistorySummaryRow[]> {
    const aggregateRows = await this.database
      .select({
        assetId: trafficAggregates.assetId,
        direction: trafficAggregates.direction,
        bucketStart: trafficAggregates.bucketStart,
        averageSpeedKmh: trafficAggregates.averageSpeedKmh,
        vehicleCount: trafficAggregates.vehicleCount,
        sampleCount: trafficAggregates.sampleCount,
        vehicleClassBreakdown: trafficAggregates.vehicleClassBreakdown,
        laneBreakdown: trafficAggregates.laneBreakdown,
        laneVehicleClassBreakdown: trafficAggregates.laneVehicleClassBreakdown,
      })
      .from(trafficAggregates)
      .where(
        and(
          inArray(trafficAggregates.assetId, query.assetIds),
          eq(trafficAggregates.resolution, query.resolution),
          gte(trafficAggregates.bucketStart, query.from),
          lt(trafficAggregates.bucketStart, query.to),
        ),
      )
      .orderBy(asc(trafficAggregates.bucketStart));

    if (query.resolution === "minute") return aggregateRows;

    const statisticRows = await this.database
      .select({
        assetId: trafficVolumeStatistics.assetId,
        direction: trafficVolumeStatistics.direction,
        bucketStart: trafficVolumeStatistics.bucketStart,
        averageSpeedKmh: trafficSpeedStatistics.averageSpeedKmh,
        vehicleCount: trafficVolumeStatistics.vehicleCount,
        sampleCount: trafficSpeedStatistics.detectedVehicleCount,
      })
      .from(trafficVolumeStatistics)
      .leftJoin(
        trafficSpeedStatistics,
        and(
          eq(trafficSpeedStatistics.assetId, trafficVolumeStatistics.assetId),
          eq(
            trafficSpeedStatistics.direction,
            trafficVolumeStatistics.direction,
          ),
          eq(
            trafficSpeedStatistics.resolution,
            trafficVolumeStatistics.resolution,
          ),
          eq(
            trafficSpeedStatistics.bucketStart,
            trafficVolumeStatistics.bucketStart,
          ),
        ),
      )
      .where(
        and(
          inArray(trafficVolumeStatistics.assetId, query.assetIds),
          eq(trafficVolumeStatistics.resolution, query.resolution),
          gte(trafficVolumeStatistics.bucketStart, query.from),
          lt(trafficVolumeStatistics.bucketStart, query.to),
        ),
      );
    const rowsByBucket = new Map<string, HistorySummaryRow>(
      aggregateRows.map((row) => [summaryRowKey(row), row]),
    );
    for (const row of statisticRows) {
      const aggregate = rowsByBucket.get(summaryRowKey(row));
      rowsByBucket.set(summaryRowKey(row), {
        ...row,
        averageSpeedKmh:
          row.averageSpeedKmh ?? aggregate?.averageSpeedKmh ?? null,
        sampleCount: row.sampleCount ?? aggregate?.sampleCount ?? 0,
        vehicleClassBreakdown: aggregate?.vehicleClassBreakdown ?? {},
        laneBreakdown: aggregate?.laneBreakdown ?? {},
        laneVehicleClassBreakdown: aggregate?.laneVehicleClassBreakdown ?? {},
      });
    }
    return [...rowsByBucket.values()].sort(
      (left, right) => left.bucketStart.getTime() - right.bucketStart.getTime(),
    );
  }

  async listAvailableDates(
    assetIds: string[],
    fromDate: string,
    toDate: string,
    resolution: ResolvedHistoryResolution,
    metric: HistoryMetric,
    timeZone: string,
    direction: 1 | 2,
  ) {
    const aggregateSourceDate = sql<string>`to_char(${trafficAggregates.bucketStart} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`;
    const aggregateDates = await this.database
      .selectDistinct({
        assetId: trafficAggregates.assetId,
        sourceDate: aggregateSourceDate,
      })
      .from(trafficAggregates)
      .where(
        and(
          inArray(trafficAggregates.assetId, assetIds),
          eq(trafficAggregates.resolution, resolution),
          eq(trafficAggregates.direction, direction),
          gte(aggregateSourceDate, fromDate),
          lte(aggregateSourceDate, toDate),
        ),
      );
    if (resolution === "minute") return aggregateDates;

    const table =
      metric === "average-speed-kmh"
        ? trafficSpeedStatistics
        : trafficVolumeStatistics;
    const sourceDate = sql<string>`to_char(${table.bucketStart} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`;
    const statisticDates = await this.database
      .selectDistinct({ assetId: table.assetId, sourceDate })
      .from(table)
      .where(
        and(
          inArray(table.assetId, assetIds),
          eq(table.resolution, resolution),
          eq(table.direction, direction),
          gte(sourceDate, fromDate),
          lte(sourceDate, toDate),
        ),
      );
    return deduplicateDates([...aggregateDates, ...statisticDates]);
  }

  async listCompletedStatisticsChunks(
    assetIds: string[],
    fromDate: string,
    toDate: string,
    resolution: "hour" | "day",
    direction: 1 | 2,
  ) {
    return this.database
      .select({
        assetId: trafficStatisticsImportChunks.assetId,
        fromDate: trafficStatisticsImportChunks.fromDate,
        toDate: trafficStatisticsImportChunks.toDate,
      })
      .from(trafficStatisticsImportChunks)
      .where(
        and(
          inArray(trafficStatisticsImportChunks.assetId, assetIds),
          eq(trafficStatisticsImportChunks.resolution, resolution),
          eq(trafficStatisticsImportChunks.direction, direction),
          lte(trafficStatisticsImportChunks.fromDate, toDate),
          gte(trafficStatisticsImportChunks.toDate, fromDate),
        ),
      );
  }

  async listStatisticsImportFailures(
    assetIds: string[],
    fromDate: string,
    toDate: string,
    resolution: "hour" | "day",
    direction: 1 | 2,
    metric: HistoryMetric,
  ) {
    return this.database
      .select({
        assetId: trafficStatisticsImportFailures.assetId,
        fromDate: trafficStatisticsImportFailures.fromDate,
        toDate: trafficStatisticsImportFailures.toDate,
      })
      .from(trafficStatisticsImportFailures)
      .where(
        and(
          inArray(trafficStatisticsImportFailures.assetId, assetIds),
          eq(trafficStatisticsImportFailures.resolution, resolution),
          eq(trafficStatisticsImportFailures.direction, direction),
          eq(
            trafficStatisticsImportFailures.metric,
            metric === "vehicle-count" ? "volume" : "speed",
          ),
          lte(trafficStatisticsImportFailures.fromDate, toDate),
          gte(trafficStatisticsImportFailures.toDate, fromDate),
        ),
      );
  }

  async listAvailability(coverageAreaId: string, timeZone: string) {
    const artifactDates = await this.database
      .select({
        assetId: ingestionArtifacts.assetId,
        sourceDate: ingestionArtifacts.sourceDate,
      })
      .from(ingestionArtifacts)
      .innerJoin(
        trafficAssets,
        eq(trafficAssets.id, ingestionArtifacts.assetId),
      )
      .where(
        and(
          eq(trafficAssets.coverageAreaId, coverageAreaId),
          eq(ingestionArtifacts.status, "PROCESSED"),
          gt(ingestionArtifacts.validRecordCount, 0),
        ),
      )
      .orderBy(
        asc(ingestionArtifacts.assetId),
        asc(ingestionArtifacts.sourceDate),
      );
    const statisticDates = await this.database
      .selectDistinct({
        assetId: trafficVolumeStatistics.assetId,
        sourceDate: sql<string>`to_char(${trafficVolumeStatistics.bucketStart} AT TIME ZONE ${timeZone}, 'YYYY-MM-DD')`,
      })
      .from(trafficVolumeStatistics)
      .innerJoin(
        trafficAssets,
        eq(trafficAssets.id, trafficVolumeStatistics.assetId),
      )
      .where(eq(trafficAssets.coverageAreaId, coverageAreaId));
    return deduplicateDates([...artifactDates, ...statisticDates]).sort(
      (left, right) =>
        left.assetId.localeCompare(right.assetId) ||
        left.sourceDate.localeCompare(right.sourceDate),
    );
  }

  async getReplayFrames(query: {
    assetIds: string[];
    direction: 1 | 2;
    from: Date;
    to: Date;
  }) {
    const rows = await this.database
      .select({
        assetId: trafficAggregates.assetId,
        timestamp: trafficAggregates.bucketStart,
        averageSpeedKmh: trafficAggregates.averageSpeedKmh,
        vehicleCount: trafficAggregates.vehicleCount,
        sampleCount: trafficAggregates.sampleCount,
      })
      .from(trafficAggregates)
      .where(
        and(
          inArray(trafficAggregates.assetId, query.assetIds),
          eq(trafficAggregates.direction, query.direction),
          eq(trafficAggregates.resolution, "minute"),
          gte(trafficAggregates.bucketStart, query.from),
          lt(trafficAggregates.bucketStart, query.to),
        ),
      )
      .orderBy(asc(trafficAggregates.bucketStart));
    const byTimestamp = new Map<string, (typeof rows)[number][]>();

    for (const row of rows) {
      const timestamp = row.timestamp.toISOString();
      byTimestamp.set(timestamp, [...(byTimestamp.get(timestamp) ?? []), row]);
    }

    return [...byTimestamp.entries()].map(([timestamp, values]) => ({
      timestamp,
      values: values.map((value) => ({
        assetId: value.assetId,
        averageSpeedKmh: value.averageSpeedKmh,
        vehicleCount: value.vehicleCount,
        sampleCount: value.sampleCount,
      })),
    }));
  }
}

function summaryRowKey(row: {
  assetId: string;
  direction: number;
  bucketStart: Date;
}) {
  return `${row.assetId}:${row.direction}:${row.bucketStart.toISOString()}`;
}

function deduplicateDates(
  rows: Array<{ assetId: string; sourceDate: string }>,
) {
  return [
    ...new Map(
      rows.map((row) => [`${row.assetId}:${row.sourceDate}`, row]),
    ).values(),
  ];
}
