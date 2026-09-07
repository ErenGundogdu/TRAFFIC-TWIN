import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  ingestionArtifacts,
  trafficAggregates,
} from "../../infrastructure/database/schema.js";
import { HistoryImportRepository } from "../ingestion/history-import-repository.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryRepository } from "./history-repository.js";

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
              label: "Yön 1",
              averageSpeedKmh: 82.5,
              flowVehiclesPerHour: 42,
              measuredAt: "2020-01-15T10:00:00Z",
            },
            {
              direction: 2,
              label: "Yön 2",
              averageSpeedKmh: null,
              flowVehiclesPerHour: null,
              measuredAt: null,
            },
          ],
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
      [
        {
          direction: 1,
          resolution: "hour",
          bucketStart: new Date("2020-01-15T10:00:00Z"),
          averageSpeedKmh: 82.5,
          vehicleCount: 42,
          sampleCount: 42,
        },
      ],
      43,
      42,
    );

    const repository = new HistoryRepository(connection.db);
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

    const summaryRows = await repository.getSummaryRows({
      assetIds: ["fintraffic-tms:20002"],
      resolution: "hour",
      from: new Date("2020-01-15T09:00:00Z"),
      to: new Date("2020-01-15T11:00:00Z"),
    });
    expect(summaryRows).toEqual([
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        bucketStart: new Date("2020-01-15T10:00:00Z"),
        averageSpeedKmh: 82.5,
        vehicleCount: 42,
        sampleCount: 42,
      },
    ]);

    const availability = await repository.listAvailability("helsinki");
    expect(availability).toContainEqual({
      assetId: "fintraffic-tms:20002",
      sourceDate: "2020-01-15",
    });

    await connection.db
      .delete(trafficAggregates)
      .where(eq(trafficAggregates.artifactId, artifactId));
    await connection.db
      .delete(ingestionArtifacts)
      .where(eq(ingestionArtifacts.id, artifactId));
  });
});
