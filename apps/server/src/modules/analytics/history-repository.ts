import type {
  HistoryMetric,
  HistorySeries,
  ResolvedHistoryResolution,
} from "@traffic-twin/contracts";
import { and, asc, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  ingestionArtifacts,
  trafficAggregates,
  trafficAssets,
} from "../../infrastructure/database/schema.js";

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
    const rows = await this.database
      .select({
        assetId: trafficAggregates.assetId,
        assetName: trafficAssets.name,
        bucketStart: trafficAggregates.bucketStart,
        averageSpeedKmh: trafficAggregates.averageSpeedKmh,
        vehicleCount: trafficAggregates.vehicleCount,
        sampleCount: trafficAggregates.sampleCount,
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

    return query.assetIds.map((assetId) => {
      const assetRows = rows.filter((row) => row.assetId === assetId);
      return {
        assetId,
        assetName: assetRows[0]?.assetName ?? assetId,
        points: assetRows.map((row) => ({
          timestamp: row.bucketStart.toISOString(),
          value:
            query.metric === "average-speed-kmh"
              ? row.averageSpeedKmh
              : row.vehicleCount,
          sampleCount: row.sampleCount,
        })),
      };
    });
  }

  async listAvailableDates(
    assetIds: string[],
    fromDate: string,
    toDate: string,
  ) {
    return this.database
      .select({
        assetId: ingestionArtifacts.assetId,
        sourceDate: ingestionArtifacts.sourceDate,
      })
      .from(ingestionArtifacts)
      .where(
        and(
          inArray(ingestionArtifacts.assetId, assetIds),
          eq(ingestionArtifacts.status, "PROCESSED"),
          gte(ingestionArtifacts.sourceDate, fromDate),
          lte(ingestionArtifacts.sourceDate, toDate),
        ),
      );
  }

  async listAvailability(coverageAreaId: string) {
    return this.database
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
