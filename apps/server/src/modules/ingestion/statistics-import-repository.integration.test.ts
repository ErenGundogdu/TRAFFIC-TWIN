import { randomInt, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  trafficAssets,
  trafficSpeedStatistics,
  trafficStatisticsImportFailures,
  trafficVolumeStatistics,
} from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryRepository } from "../analytics/history-repository.js";
import { StatisticsImportRepository } from "./statistics-import-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("StatisticsImportRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );
  const repository = new StatisticsImportRepository(connection.db);
  const stationRepository = new PostgresStationCatalogRepository(connection.db);
  const stationId = `test-statistics-${randomUUID()}`;

  afterAll(async () => {
    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, stationId));
    await connection.pool.end();
  });

  it("keeps volume and speed facts separate and updates them idempotently", async () => {
    const tmsNumber = randomInt(1_000_000_000, 2_000_000_000);
    await stationRepository.upsertStations(
      "helsinki",
      [
        {
          id: stationId,
          providerStationId: tmsNumber,
          tmsNumber,
          name: "Statistics integration station",
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
              averageSpeedKmh: null,
              flowVehiclesPerHour: null,
              measuredAt: null,
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
      new Date("2026-09-21T00:00:00Z"),
    );
    const bucketStart = new Date("2026-01-01T10:00:00Z");
    const chunk = {
      assetId: stationId,
      resolution: "hour" as const,
      from: "2026-01-01",
      to: "2026-01-01",
      direction: 1 as const,
    };
    await expect(repository.isChunkComplete(chunk)).resolves.toBe(false);

    await repository.upsertVolumes(stationId, [
      {
        direction: 1,
        resolution: "hour",
        bucketStart,
        vehicleCount: 120,
      },
    ]);
    await repository.upsertSpeeds(stationId, [
      {
        direction: 1,
        resolution: "hour",
        bucketStart,
        averageSpeedKmh: 82.5,
        detectedVehicleCount: 117,
      },
    ]);
    await repository.markChunkComplete({
      ...chunk,
      volumeRowCount: 1,
      speedRowCount: 1,
    });
    await expect(repository.isChunkComplete(chunk)).resolves.toBe(true);
    await expect(
      repository.isChunkComplete({
        ...chunk,
        from: "2026-01-01",
        to: "2026-01-02",
      }),
    ).resolves.toBe(false);
    await repository.markChunkComplete({
      ...chunk,
      from: "2026-01-02",
      to: "2026-01-02",
      volumeRowCount: 0,
      speedRowCount: 0,
    });
    await expect(
      repository.isChunkComplete({
        ...chunk,
        from: "2026-01-01",
        to: "2026-01-02",
      }),
    ).resolves.toBe(true);
    await repository.upsertVolumes(stationId, [
      {
        direction: 1,
        resolution: "hour",
        bucketStart,
        vehicleCount: 125,
      },
    ]);

    const [volume] = await connection.db
      .select()
      .from(trafficVolumeStatistics)
      .where(
        and(
          eq(trafficVolumeStatistics.assetId, stationId),
          eq(trafficVolumeStatistics.bucketStart, bucketStart),
        ),
      );
    const [speed] = await connection.db
      .select()
      .from(trafficSpeedStatistics)
      .where(
        and(
          eq(trafficSpeedStatistics.assetId, stationId),
          eq(trafficSpeedStatistics.bucketStart, bucketStart),
        ),
      );

    expect(volume?.vehicleCount).toBe(125);
    expect(speed).toMatchObject({
      averageSpeedKmh: 82.5,
      detectedVehicleCount: 117,
    });

    const historyRepository = new HistoryRepository(connection.db);
    await expect(
      historyRepository.getSeries({
        assetIds: [stationId],
        direction: 1,
        resolution: "hour",
        metric: "vehicle-count",
        from: new Date("2026-01-01T09:00:00Z"),
        to: new Date("2026-01-01T11:00:00Z"),
      }),
    ).resolves.toMatchObject([
      {
        assetId: stationId,
        points: [
          {
            timestamp: "2026-01-01T10:00:00.000Z",
            value: 125,
            sampleCount: 125,
          },
        ],
      },
    ]);
    await expect(
      historyRepository.getSummaryRows({
        assetIds: [stationId],
        resolution: "hour",
        from: new Date("2026-01-01T09:00:00Z"),
        to: new Date("2026-01-01T11:00:00Z"),
      }),
    ).resolves.toMatchObject([
      {
        assetId: stationId,
        averageSpeedKmh: 82.5,
        vehicleCount: 125,
        sampleCount: 117,
      },
    ]);
    await expect(
      historyRepository.listAvailableDates(
        [stationId],
        "2026-01-01",
        "2026-01-01",
        "hour",
        "average-speed-kmh",
        "Europe/Helsinki",
        1,
      ),
    ).resolves.toContainEqual({
      assetId: stationId,
      sourceDate: "2026-01-01",
    });

    await repository.recordFailure({
      ...chunk,
      from: "2026-01-03",
      to: "2026-01-03",
      metric: "speed",
      errorCode: "SOURCE_CALCULATION",
    });
    await expect(
      historyRepository.listStatisticsImportFailures(
        [stationId],
        "2026-01-03",
        "2026-01-03",
        "hour",
        1,
        "average-speed-kmh",
      ),
    ).resolves.toEqual([
      {
        assetId: stationId,
        fromDate: "2026-01-03",
        toDate: "2026-01-03",
      },
    ]);
    await repository.clearFailures({
      ...chunk,
      from: "2026-01-03",
      to: "2026-01-03",
      metric: "speed",
    });
    await expect(
      connection.db
        .select()
        .from(trafficStatisticsImportFailures)
        .where(eq(trafficStatisticsImportFailures.assetId, stationId)),
    ).resolves.toEqual([]);
  });
});
