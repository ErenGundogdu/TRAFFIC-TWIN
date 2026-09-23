import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  trafficSpeedStatistics,
  trafficStatisticsImportChunks,
  trafficStatisticsImportFailures,
  trafficVolumeStatistics,
} from "../../infrastructure/database/schema.js";
import type {
  SpeedStatistic,
  VolumeStatistic,
} from "../providers/fintraffic/parse-statistics-report.js";

export class StatisticsImportRepository {
  constructor(private readonly database: Database) {}

  async isChunkComplete(chunk: StatisticsImportChunk) {
    const completed = await this.database
      .select({
        fromDate: trafficStatisticsImportChunks.fromDate,
        toDate: trafficStatisticsImportChunks.toDate,
      })
      .from(trafficStatisticsImportChunks)
      .where(
        and(
          eq(trafficStatisticsImportChunks.assetId, chunk.assetId),
          eq(trafficStatisticsImportChunks.resolution, chunk.resolution),
          lte(trafficStatisticsImportChunks.fromDate, chunk.to),
          gte(trafficStatisticsImportChunks.toDate, chunk.from),
          eq(trafficStatisticsImportChunks.direction, chunk.direction),
        ),
      )
      .orderBy(asc(trafficStatisticsImportChunks.fromDate));
    let nextDate = chunk.from;
    for (const range of completed) {
      if (range.fromDate > nextDate) return false;
      if (range.toDate >= nextDate) {
        nextDate = nextDateAfter(range.toDate);
      }
      if (nextDate > chunk.to) return true;
    }
    return false;
  }

  async markChunkComplete(
    chunk: StatisticsImportChunk & {
      volumeRowCount: number;
      speedRowCount: number;
    },
  ) {
    await this.database
      .insert(trafficStatisticsImportChunks)
      .values({
        assetId: chunk.assetId,
        resolution: chunk.resolution,
        fromDate: chunk.from,
        toDate: chunk.to,
        direction: chunk.direction,
        volumeRowCount: chunk.volumeRowCount,
        speedRowCount: chunk.speedRowCount,
      })
      .onConflictDoNothing();
  }

  async recordFailure(
    chunk: StatisticsImportChunk & {
      metric: "volume" | "speed";
      errorCode: "SOURCE_CALCULATION" | "UPSTREAM_UNAVAILABLE";
    },
  ) {
    await this.database
      .insert(trafficStatisticsImportFailures)
      .values({
        assetId: chunk.assetId,
        resolution: chunk.resolution,
        direction: chunk.direction,
        metric: chunk.metric,
        fromDate: chunk.from,
        toDate: chunk.to,
        errorCode: chunk.errorCode,
      })
      .onConflictDoUpdate({
        target: [
          trafficStatisticsImportFailures.assetId,
          trafficStatisticsImportFailures.resolution,
          trafficStatisticsImportFailures.direction,
          trafficStatisticsImportFailures.metric,
          trafficStatisticsImportFailures.fromDate,
          trafficStatisticsImportFailures.toDate,
        ],
        set: {
          errorCode: chunk.errorCode,
          attemptedAt: new Date(),
        },
      });
  }

  async clearFailures(
    chunk: StatisticsImportChunk & { metric: "volume" | "speed" },
  ) {
    await this.database
      .delete(trafficStatisticsImportFailures)
      .where(
        and(
          eq(trafficStatisticsImportFailures.assetId, chunk.assetId),
          eq(trafficStatisticsImportFailures.resolution, chunk.resolution),
          eq(trafficStatisticsImportFailures.direction, chunk.direction),
          eq(trafficStatisticsImportFailures.metric, chunk.metric),
          gte(trafficStatisticsImportFailures.fromDate, chunk.from),
          lte(trafficStatisticsImportFailures.toDate, chunk.to),
        ),
      );
  }

  async upsertVolumes(assetId: string, rows: VolumeStatistic[]) {
    if (rows.length === 0) return 0;
    await this.database
      .insert(trafficVolumeStatistics)
      .values(rows.map((row) => ({ assetId, ...row })))
      .onConflictDoUpdate({
        target: [
          trafficVolumeStatistics.assetId,
          trafficVolumeStatistics.direction,
          trafficVolumeStatistics.resolution,
          trafficVolumeStatistics.bucketStart,
        ],
        set: {
          vehicleCount: sql`excluded.vehicle_count`,
          importedAt: new Date(),
        },
      });
    return rows.length;
  }

  async upsertSpeeds(assetId: string, rows: SpeedStatistic[]) {
    if (rows.length === 0) return 0;
    await this.database
      .insert(trafficSpeedStatistics)
      .values(rows.map((row) => ({ assetId, ...row })))
      .onConflictDoUpdate({
        target: [
          trafficSpeedStatistics.assetId,
          trafficSpeedStatistics.direction,
          trafficSpeedStatistics.resolution,
          trafficSpeedStatistics.bucketStart,
        ],
        set: {
          averageSpeedKmh: sql`excluded.average_speed_kmh`,
          detectedVehicleCount: sql`excluded.detected_vehicle_count`,
          importedAt: new Date(),
        },
      });
    return rows.length;
  }
}

function nextDateAfter(date: string) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export interface StatisticsImportChunk {
  assetId: string;
  resolution: "hour" | "day";
  from: string;
  to: string;
  direction: 1 | 2;
}
