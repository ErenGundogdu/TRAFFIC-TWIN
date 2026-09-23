import { randomInt, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  anomalyEvaluations,
  coverageAreas,
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAggregates,
  trafficAssets,
  trafficSpeedStatistics,
  trafficVolumeStatistics,
} from "../../infrastructure/database/schema.js";
import { HistoryImportRepository } from "../ingestion/history-import-repository.js";
import { PostgresAnomalyRepository } from "./anomaly-repository.js";
import { DEFAULT_ANOMALY_POLICY } from "./anomaly-engine.js";

describe("PostgresAnomalyRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("queries a local weekly slot and persists its evidence", async () => {
    const suffix = randomUUID();
    const coverageAreaId = `test-anomaly-${suffix}`;
    const assetId = `test-anomaly-station-${suffix}`;
    const artifactId = `test-anomaly-artifact-${suffix}`;
    const numericId = 1_000_000_000 + randomInt(900_000_000);
    await connection.db.insert(coverageAreas).values({
      id: coverageAreaId,
      name: "Test coverage",
      timeZone: "Europe/Helsinki",
      minLongitude: 24.5,
      minLatitude: 60.1,
      maxLongitude: 25.25,
      maxLatitude: 60.45,
    });
    await connection.db.insert(trafficAssets).values({
      id: assetId,
      coverageAreaId,
      provider: "integration-test",
      providerStationId: numericId,
      tmsNumber: numericId,
      kind: "sensor-station",
      name: "Test station",
      location: { x: 24.9, y: 60.2 },
      collecting: true,
    });
    const imports = new HistoryImportRepository(connection.db);
    await imports.recordDownloaded({
      id: artifactId,
      provider: "integration-test",
      assetId,
      sourceDate: "2026-08-29",
      sourceUrl: "https://example.invalid/anomaly.csv",
      storagePath: "/tmp/anomaly.csv.gz",
      checksumSha256: "b".repeat(64),
      byteSize: 128,
      processorVersion: "integration-v1",
    });
    await imports.replaceWithProcessed(
      artifactId,
      assetId,
      "2026-08-29",
      [
        {
          direction: 1,
          resolution: "hour",
          bucketStart: new Date("2026-08-29T09:00:00.000Z"),
          averageSpeedKmh: 80,
          vehicleCount: 900,
          sampleCount: 100,
          vehicleClassBreakdown: {},
          laneBreakdown: {},
          laneVehicleClassBreakdown: {},
        },
        {
          direction: 1,
          resolution: "hour",
          bucketStart: new Date("2026-08-29T10:00:00.000Z"),
          averageSpeedKmh: 70,
          vehicleCount: 800,
          sampleCount: 100,
          vehicleClassBreakdown: {},
          laneBreakdown: {},
          laneVehicleClassBreakdown: {},
        },
      ],
      200,
      200,
    );
    await connection.db.insert(trafficVolumeStatistics).values([
      {
        assetId,
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-08-29T09:00:00.000Z"),
        vehicleCount: 950,
      },
      {
        assetId,
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-08-22T09:00:00.000Z"),
        vehicleCount: 700,
      },
    ]);
    await connection.db.insert(trafficSpeedStatistics).values([
      {
        assetId,
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-08-29T09:00:00.000Z"),
        averageSpeedKmh: 82,
        detectedVehicleCount: 950,
      },
      {
        assetId,
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-08-22T09:00:00.000Z"),
        averageSpeedKmh: 76,
        detectedVehicleCount: 700,
      },
    ]);

    const repository = new PostgresAnomalyRepository(connection.db);
    const baseline = await repository.listHourlyBaseline({
      assetIds: [assetId],
      from: new Date("2026-08-21T00:00:00.000Z"),
      to: new Date("2026-08-30T00:00:00.000Z"),
      timeZone: "Europe/Helsinki",
      localWeekday: 6,
      localHour: 12,
    });
    expect(baseline).toEqual([
      expect.objectContaining({
        assetId,
        timestamp: "2026-08-22T09:00:00.000Z",
        averageSpeedKmh: 76,
        flowVehiclesPerHour: 700,
      }),
      expect.objectContaining({
        assetId,
        timestamp: "2026-08-29T09:00:00.000Z",
        averageSpeedKmh: 82,
        flowVehiclesPerHour: 950,
      }),
    ]);

    const evaluation = {
      id: `anomaly-${suffix}`,
      coverageAreaId,
      assetId,
      direction: 1,
      metric: "average-speed-kmh",
      status: "CANDIDATE",
      confidence: "LOW",
      observedAt: "2026-09-05T09:05:00.000Z",
      currentValue: 30,
      expectedMedian: 80,
      medianAbsoluteDeviation: 1,
      expectedLowerBound: 75,
      expectedUpperBound: 85,
      absoluteDeviation: 50,
      sampleCount: 6,
      consecutiveDeviations: 1,
      minimumSamples: 6,
      requiredConsecutiveDeviations: 2,
      policyVersion: DEFAULT_ANOMALY_POLICY.version,
      baselineWindowWeeks: DEFAULT_ANOMALY_POLICY.windowWeeks,
      baselineStart: "2026-06-13T09:05:00.000Z",
      baselineEnd: "2026-09-05T09:05:00.000Z",
      baselineSamples: baseline.flatMap((sample) =>
        sample.averageSpeedKmh === null
          ? []
          : [
              {
                timestamp: sample.timestamp,
                value: sample.averageSpeedKmh,
              },
            ],
      ),
      localTimeZone: "Europe/Helsinki",
      localWeekday: 6,
      localHour: 12,
      policy: DEFAULT_ANOMALY_POLICY,
    } as const;
    await repository.save([evaluation]);
    await repository.save([
      {
        ...evaluation,
        status: "ACTIVE",
        observedAt: "2026-09-05T09:10:00.000Z",
        currentValue: 28,
        consecutiveDeviations: 2,
      },
    ]);
    await expect(
      repository.listLatestCoverage(coverageAreaId),
    ).resolves.toEqual([
      expect.objectContaining({
        assetId,
        status: "ACTIVE",
        observedAt: "2026-09-05T09:10:00.000Z",
        consecutiveDeviations: 2,
        minimumSamples: 6,
        requiredConsecutiveDeviations: 2,
      }),
    ]);

    await connection.db
      .delete(anomalyEvaluations)
      .where(eq(anomalyEvaluations.assetId, assetId));
    await connection.db
      .delete(trafficSpeedStatistics)
      .where(eq(trafficSpeedStatistics.assetId, assetId));
    await connection.db
      .delete(trafficVolumeStatistics)
      .where(eq(trafficVolumeStatistics.assetId, assetId));
    await connection.db
      .delete(trafficAggregates)
      .where(eq(trafficAggregates.assetId, assetId));
    await connection.db
      .delete(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.assetId, assetId));
    await connection.db
      .delete(ingestionArtifacts)
      .where(eq(ingestionArtifacts.id, artifactId));
    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, assetId));
    await connection.db
      .delete(coverageAreas)
      .where(eq(coverageAreas.id, coverageAreaId));
  });
});
