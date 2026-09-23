import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAggregates,
  trafficSpeedStatistics,
  trafficStatisticsImportChunks,
  trafficVolumeStatistics,
} from "../../infrastructure/database/schema.js";
import { HistoryImportRepository } from "../ingestion/history-import-repository.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryRepository } from "./history-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("HistoryRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("persists and queries a canonical aggregate without losing provenance", async () => {
    await new PostgresStationCatalogRepository(connection.db).upsertStations(
      "helsinki",
      [
        {
          id: "fintraffic-tms:20002",
          providerStationId: 20002,
          tmsNumber: 20002,
          name: "vt1_Espoo_Hirvisuo",
          longitude: 24.637997,
          latitude: 60.220898,
          bearing: 298,
          freshness: "FRESH",
          directions: [
            {
              direction: 1,
              heading: {
                degrees: 298,
                compassPoint: "NW",
                determination: "PROVIDER_REPORTED",
              },
              averageSpeedKmh: 82.5,
              flowVehiclesPerHour: 42,
              measuredAt: "2020-01-15T10:00:00Z",
              trafficFlow: unknownTrafficFlow,
            },
            {
              direction: 2,
              heading: {
                degrees: 118,
                compassPoint: "SE",
                determination: "DERIVED_OPPOSITE",
              },
              averageSpeedKmh: null,
              flowVehiclesPerHour: null,
              measuredAt: null,
              trafficFlow: unknownTrafficFlow,
            },
          ],
          lanes: [],
        },
      ],
      new Date("2020-01-15T10:00:00Z"),
    );
    const artifactId = `test-history-${randomUUID()}`;
    const importRepository = new HistoryImportRepository(connection.db);
    await importRepository.recordDownloaded({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId: "fintraffic-tms:20002",
      sourceDate: "2020-01-15",
      sourceUrl: "https://example.invalid/test.csv",
      storagePath: "/tmp/test.csv.gz",
      checksumSha256: "a".repeat(64),
      byteSize: 128,
      processorVersion: "integration-test-v1",
    });
    await importRepository.replaceWithProcessed(
      artifactId,
      "fintraffic-tms:20002",
      "2020-01-15",
      [
        {
          direction: 1,
          resolution: "hour",
          bucketStart: new Date("2020-01-15T10:00:00Z"),
          averageSpeedKmh: 82.5,
          vehicleCount: 42,
          sampleCount: 42,
          vehicleClassBreakdown: {
            "1": { vehicleCount: 40, speedTotalKmh: 3_300 },
            "2": { vehicleCount: 2, speedTotalKmh: 165 },
          },
          laneBreakdown: {
            "1": { vehicleCount: 42, speedTotalKmh: 3_465 },
          },
          laneVehicleClassBreakdown: {
            "1:1": { vehicleCount: 40, speedTotalKmh: 3_300 },
            "1:2": { vehicleCount: 2, speedTotalKmh: 165 },
          },
        },
      ],
      43,
      42,
    );

    const repository = new HistoryRepository(connection.db);
    await expect(
      connection.db
        .select({
          vehicleClassBreakdown: trafficAggregates.vehicleClassBreakdown,
          laneBreakdown: trafficAggregates.laneBreakdown,
          laneVehicleClassBreakdown:
            trafficAggregates.laneVehicleClassBreakdown,
        })
        .from(trafficAggregates)
        .where(eq(trafficAggregates.artifactId, artifactId)),
    ).resolves.toEqual([
      {
        vehicleClassBreakdown: {
          "1": { vehicleCount: 40, speedTotalKmh: 3_300 },
          "2": { vehicleCount: 2, speedTotalKmh: 165 },
        },
        laneBreakdown: {
          "1": { vehicleCount: 42, speedTotalKmh: 3_465 },
        },
        laneVehicleClassBreakdown: {
          "1:1": { vehicleCount: 40, speedTotalKmh: 3_300 },
          "1:2": { vehicleCount: 2, speedTotalKmh: 165 },
        },
      },
    ]);
    const series = await repository.getSeries({
      assetIds: ["fintraffic-tms:20002"],
      direction: 1,
      resolution: "hour",
      metric: "average-speed-kmh",
      from: new Date("2020-01-15T09:00:00Z"),
      to: new Date("2020-01-15T11:00:00Z"),
    });

    expect(series[0]?.points).toEqual([
      {
        timestamp: "2020-01-15T10:00:00.000Z",
        value: 82.5,
        sampleCount: 42,
      },
    ]);
    await expect(
      repository.listAvailableDates(
        ["fintraffic-tms:20002"],
        "2020-01-15",
        "2020-01-15",
        "hour",
        "average-speed-kmh",
        "Europe/Helsinki",
        1,
      ),
    ).resolves.toContainEqual({
      assetId: "fintraffic-tms:20002",
      sourceDate: "2020-01-15",
    });
    await expect(
      repository.listAvailableDates(
        ["fintraffic-tms:20002"],
        "2020-01-15",
        "2020-01-15",
        "minute",
        "average-speed-kmh",
        "Europe/Helsinki",
        1,
      ),
    ).resolves.toEqual([]);

    const summaryRows = await repository.getSummaryRows({
      assetIds: ["fintraffic-tms:20002"],
      resolution: "hour",
      from: new Date("2020-01-15T09:00:00Z"),
      to: new Date("2020-01-15T11:00:00Z"),
    });
    expect(summaryRows).toMatchObject([
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        bucketStart: new Date("2020-01-15T10:00:00Z"),
        averageSpeedKmh: 82.5,
        vehicleCount: 42,
        sampleCount: 42,
      },
    ]);

    const availability = await repository.listAvailability(
      "helsinki",
      "Europe/Helsinki",
    );
    expect(availability).toContainEqual({
      assetId: "fintraffic-tms:20002",
      sourceDate: "2020-01-15",
    });

    const importPlanRows =
      await importRepository.listArtifactsForAssetDateRange(
        "fintraffic-tms:20002",
        "2020-01-15",
        "2020-01-16",
      );
    expect(importPlanRows).toContainEqual({
      id: artifactId,
      sourceDate: "2020-01-15",
      status: "PROCESSED",
      recordCount: 43,
      validRecordCount: 42,
      errorMessage: null,
      updatedAt: expect.any(Date),
    });

    await connection.db
      .delete(trafficAggregates)
      .where(eq(trafficAggregates.artifactId, artifactId));
    await connection.db
      .delete(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.artifactId, artifactId));
    await connection.db
      .delete(ingestionArtifacts)
      .where(eq(ingestionArtifacts.id, artifactId));
  });

  it("keeps a Statistics volume bucket without inventing speed coverage", async () => {
    const bucketStart = new Date("2017-01-01T00:00:00Z");
    await connection.db.insert(trafficVolumeStatistics).values({
      assetId: "fintraffic-tms:20002",
      direction: 1,
      resolution: "day",
      bucketStart,
      vehicleCount: 123,
    });

    try {
      const repository = new HistoryRepository(connection.db);
      const rows = await repository.getSummaryRows({
        assetIds: ["fintraffic-tms:20002"],
        resolution: "day",
        from: bucketStart,
        to: new Date("2017-01-02T00:00:00Z"),
      });
      expect(rows).toMatchObject([
        {
          vehicleCount: 123,
          averageSpeedKmh: null,
          sampleCount: 0,
        },
      ]);
      await expect(
        repository.listAvailableDates(
          ["fintraffic-tms:20002"],
          "2017-01-01",
          "2017-01-01",
          "day",
          "average-speed-kmh",
          "UTC",
          1,
        ),
      ).resolves.toEqual([]);
    } finally {
      await connection.db
        .delete(trafficVolumeStatistics)
        .where(
          and(
            eq(trafficVolumeStatistics.assetId, "fintraffic-tms:20002"),
            eq(trafficVolumeStatistics.direction, 1),
            eq(trafficVolumeStatistics.resolution, "day"),
            eq(trafficVolumeStatistics.bucketStart, bucketStart),
          ),
        );
    }
  });

  it("builds hour-resolution replay frames from the bulk statistics tables and drops incomplete pairs", async () => {
    const completeBucket = new Date("2018-05-01T10:00:00Z");
    const speedOnlyBucket = new Date("2018-05-01T11:00:00Z");
    const volumeOnlyBucket = new Date("2018-05-01T12:00:00Z");
    const artifactId = `test-replay-${randomUUID()}`;
    const importRepository = new HistoryImportRepository(connection.db);

    await importRepository.recordDownloaded({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId: "fintraffic-tms:20002",
      sourceDate: "2018-05-01",
      sourceUrl: "https://example.invalid/replay.csv",
      storagePath: "/tmp/replay.csv.gz",
      checksumSha256: "b".repeat(64),
      byteSize: 128,
      processorVersion: "integration-test-v1",
    });
    await connection.db.insert(trafficAggregates).values({
      assetId: "fintraffic-tms:20002",
      direction: 1,
      resolution: "hour",
      bucketStart: completeBucket,
      averageSpeedKmh: 10,
      vehicleCount: 10,
      sampleCount: 10,
      artifactId,
    });

    await connection.db.insert(trafficVolumeStatistics).values([
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        resolution: "hour",
        bucketStart: completeBucket,
        vehicleCount: 900,
      },
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        resolution: "hour",
        bucketStart: volumeOnlyBucket,
        vehicleCount: 700,
      },
    ]);
    await connection.db.insert(trafficSpeedStatistics).values([
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        resolution: "hour",
        bucketStart: completeBucket,
        averageSpeedKmh: 87.5,
        detectedVehicleCount: 890,
      },
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        resolution: "hour",
        bucketStart: speedOnlyBucket,
        averageSpeedKmh: 90,
        detectedVehicleCount: 400,
      },
    ]);

    try {
      const repository = new HistoryRepository(connection.db);
      const frames = await repository.getReplayFrames({
        assetIds: ["fintraffic-tms:20002"],
        direction: 1,
        resolution: "hour",
        from: new Date("2018-05-01T00:00:00Z"),
        to: new Date("2018-05-02T00:00:00Z"),
      });

      // Only the bucket with both a speed and a volume reading becomes a
      // frame; a volume-only or speed-only hour is never invented into one.
      // Statistics also replace the matching raw aggregate rather than
      // duplicating the station inside the frame.
      expect(frames).toEqual([
        {
          timestamp: completeBucket.toISOString(),
          values: [
            {
              assetId: "fintraffic-tms:20002",
              averageSpeedKmh: 87.5,
              vehicleCount: 900,
              sampleCount: 890,
            },
          ],
        },
      ]);
    } finally {
      await connection.db
        .delete(trafficAggregates)
        .where(eq(trafficAggregates.artifactId, artifactId));
      await connection.db
        .delete(trafficVolumeStatistics)
        .where(
          and(
            eq(trafficVolumeStatistics.assetId, "fintraffic-tms:20002"),
            eq(trafficVolumeStatistics.direction, 1),
            eq(trafficVolumeStatistics.resolution, "hour"),
          ),
        );
      await connection.db
        .delete(trafficSpeedStatistics)
        .where(
          and(
            eq(trafficSpeedStatistics.assetId, "fintraffic-tms:20002"),
            eq(trafficSpeedStatistics.direction, 1),
            eq(trafficSpeedStatistics.resolution, "hour"),
          ),
        );
      await connection.db
        .delete(ingestionArtifacts)
        .where(eq(ingestionArtifacts.id, artifactId));
    }
  });

  it("finds only completed chunks for the selected direction and period", async () => {
    const chunk = {
      assetId: "fintraffic-tms:20002",
      resolution: "day" as const,
      fromDate: "2017-02-01",
      toDate: "2017-02-28",
      direction: 2,
      volumeRowCount: 0,
      speedRowCount: 0,
    };
    await connection.db.insert(trafficStatisticsImportChunks).values(chunk);

    try {
      const repository = new HistoryRepository(connection.db);
      await expect(
        repository.listCompletedStatisticsChunks(
          [chunk.assetId],
          "2017-02-14",
          "2017-02-14",
          "day",
          2,
        ),
      ).resolves.toEqual([
        {
          assetId: chunk.assetId,
          fromDate: chunk.fromDate,
          toDate: chunk.toDate,
        },
      ]);
      await expect(
        repository.listCompletedStatisticsChunks(
          [chunk.assetId],
          "2017-02-14",
          "2017-02-14",
          "day",
          1,
        ),
      ).resolves.toEqual([]);
    } finally {
      await connection.db
        .delete(trafficStatisticsImportChunks)
        .where(
          and(
            eq(trafficStatisticsImportChunks.assetId, chunk.assetId),
            eq(trafficStatisticsImportChunks.resolution, chunk.resolution),
            eq(trafficStatisticsImportChunks.fromDate, chunk.fromDate),
            eq(trafficStatisticsImportChunks.toDate, chunk.toDate),
            eq(trafficStatisticsImportChunks.direction, chunk.direction),
          ),
        );
    }
  });
});
