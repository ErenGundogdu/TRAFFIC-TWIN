import { randomInt, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAggregates,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryImportRepository } from "../ingestion/history-import-repository.js";
import { PostgresLaneDirectionEvidenceRepository } from "./lane-direction-evidence-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("PostgresLaneDirectionEvidenceRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("resolves a lane from persisted daily raw-history evidence", async () => {
    const suffix = randomUUID();
    const assetId = `test-lane-direction-${suffix}`;
    const artifactId = `test-lane-direction-artifact-${suffix}`;
    const providerStationId = randomInt(1_000_000_000, 2_000_000_000);
    await new PostgresStationCatalogRepository(connection.db).upsertStations(
      "helsinki",
      [
        {
          id: assetId,
          providerStationId,
          tmsNumber: providerStationId,
          name: "Test lane direction station",
          longitude: 24.9,
          latitude: 60.2,
          bearing: null,
          freshness: "UNAVAILABLE",
          directions: [
            {
              direction: 1,
              heading: null,
              averageSpeedKmh: null,
              flowVehiclesPerHour: null,
              measuredAt: null,
              trafficFlow: unknownTrafficFlow,
            },
            {
              direction: 2,
              heading: null,
              averageSpeedKmh: null,
              flowVehiclesPerHour: null,
              measuredAt: null,
              trafficFlow: unknownTrafficFlow,
            },
          ],
          lanes: [],
        },
      ],
      new Date("2026-09-01T00:00:00Z"),
    );

    const imports = new HistoryImportRepository(connection.db);
    await imports.recordDownloaded({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId,
      sourceDate: "2026-09-01",
      sourceUrl: "https://example.invalid/lane-direction.csv",
      storagePath: "/tmp/lane-direction.csv.gz",
      checksumSha256: "c".repeat(64),
      byteSize: 128,
      processorVersion: "integration-test-v1",
    });
    await imports.replaceWithProcessed(
      artifactId,
      assetId,
      "2026-09-01",
      [
        {
          direction: 2,
          resolution: "day",
          bucketStart: new Date("2026-08-31T21:00:00Z"),
          averageSpeedKmh: 82,
          vehicleCount: 100,
          sampleCount: 100,
          vehicleClassBreakdown: {},
          laneBreakdown: {
            "3": { vehicleCount: 100, speedTotalKmh: 8_200 },
          },
          laneVehicleClassBreakdown: {},
        },
      ],
      100,
      100,
    );

    await expect(
      new PostgresLaneDirectionEvidenceRepository(
        connection.db,
      ).listResolvedDirections([assetId]),
    ).resolves.toEqual([{ assetId, lane: 3, direction: 2 }]);

    await connection.db
      .delete(trafficAggregates)
      .where(eq(trafficAggregates.artifactId, artifactId));
    await connection.db
      .delete(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.artifactId, artifactId));
    await connection.db
      .delete(ingestionArtifacts)
      .where(eq(ingestionArtifacts.id, artifactId));
    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, assetId));
  });
});
