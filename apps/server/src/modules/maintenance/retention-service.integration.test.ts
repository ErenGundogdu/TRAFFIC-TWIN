import { randomInt, randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAggregates,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import { HistoryImportRepository } from "../ingestion/history-import-repository.js";
import { RawArchiveRepository } from "./raw-archive-repository.js";
import { RawArchiveRetentionService } from "./raw-archive-retention-service.js";
import { RetentionService } from "./retention-service.js";

describe("RetentionService", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("expires complete resolution days while preserving longer-lived aggregates", async () => {
    const suffix = randomUUID();
    const coverageAreaId = `test-retention-${suffix}`;
    const assetId = `test-retention-station-${suffix}`;
    const artifactId = `test-retention-artifact-${suffix}`;
    const numericId = 1_000_000_000 + randomInt(900_000_000);
    const archiveRoot = await mkdtemp(
      join(tmpdir(), "traffic-twin-retention-"),
    );
    const storagePath = join(
      archiveRoot,
      "fintraffic-tms",
      String(numericId),
      "2025-09-01.csv.gz",
    );
    await mkdir(join(archiveRoot, "fintraffic-tms", String(numericId)), {
      recursive: true,
    });
    await writeFile(storagePath, "fixture");

    await connection.db.insert(coverageAreas).values({
      id: coverageAreaId,
      name: "Retention test coverage",
      timeZone: "Europe/Helsinki",
      minLongitude: 24.5,
      minLatitude: 60.1,
      maxLongitude: 25.25,
      maxLatitude: 60.45,
    });
    await connection.db.insert(trafficAssets).values({
      id: assetId,
      coverageAreaId,
      provider: "fintraffic-tms",
      providerStationId: numericId,
      tmsNumber: numericId,
      kind: "sensor-station",
      name: "Retention test station",
      location: { x: 24.9, y: 60.2 },
      collecting: true,
    });

    const imports = new HistoryImportRepository(connection.db);
    await imports.recordDownloaded({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId,
      sourceDate: "2025-09-01",
      sourceUrl: "https://example.invalid/retention.csv",
      storagePath,
      checksumSha256: "c".repeat(64),
      byteSize: 128,
      processorVersion: "integration-v1",
    });
    await imports.replaceWithProcessed(
      artifactId,
      assetId,
      "2025-09-01",
      (["minute", "hour", "day"] as const).map((resolution) => ({
        direction: 1 as const,
        resolution,
        bucketStart: new Date("2025-09-01T10:00:00Z"),
        averageSpeedKmh: 80,
        vehicleCount: 100,
        sampleCount: 100,
        vehicleClassBreakdown: {},
        laneBreakdown: {},
        laneVehicleClassBreakdown: {},
      })),
      100,
      100,
    );
    await connection.db
      .update(ingestionArtifacts)
      .set({ updatedAt: new Date("2026-08-01T00:00:00Z") })
      .where(eq(ingestionArtifacts.id, artifactId));

    const result = await new RetentionService(connection.db).run(
      10_000,
      7,
      10_000,
      10_000,
      new Date("2026-09-10T12:00:00Z"),
    );
    expect(result.deletedMinuteAggregates).toBe(1);
    expect(result.deletedHourAggregates).toBe(0);
    expect(result.deletedDayAggregates).toBe(0);

    const coverage = await connection.db
      .select({
        resolution: historyAggregateCoverage.resolution,
        status: historyAggregateCoverage.status,
        bucketCount: historyAggregateCoverage.bucketCount,
      })
      .from(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.artifactId, artifactId));
    expect(coverage).toEqual(
      expect.arrayContaining([
        { resolution: "minute", status: "EXPIRED", bucketCount: 0 },
        { resolution: "hour", status: "AVAILABLE", bucketCount: 1 },
        { resolution: "day", status: "AVAILABLE", bucketCount: 1 },
      ]),
    );

    const rawResult = await new RawArchiveRetentionService(
      new RawArchiveRepository(connection.db),
      archiveRoot,
      {
        minuteRetentionDays: 7,
        hourRetentionDays: 730,
        dayRetentionDays: 1_825,
      },
      "integration-v1",
    ).run(14, new Date("2026-09-10T12:00:00Z"));
    expect(rawResult).toMatchObject({
      candidateCount: 1,
      purgedFileCount: 1,
      purgedByteCount: 128,
    });
    await expect(access(storagePath)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(
      connection.db
        .select({
          rawFileStatus: ingestionArtifacts.rawFileStatus,
          rawFilePurgedAt: ingestionArtifacts.rawFilePurgedAt,
        })
        .from(ingestionArtifacts)
        .where(eq(ingestionArtifacts.id, artifactId)),
    ).resolves.toEqual([
      {
        rawFileStatus: "PURGED",
        rawFilePurgedAt: new Date("2026-09-10T12:00:00Z"),
      },
    ]);

    await writeFile(storagePath, "downloaded-again");
    await imports.restoreRetainedRawFile({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId,
      sourceDate: "2025-09-01",
      sourceUrl: "https://example.invalid/retention.csv",
      storagePath,
      checksumSha256: "c".repeat(64),
      byteSize: 16,
      processorVersion: "integration-v1",
    });
    await expect(
      connection.db
        .select({
          rawFileStatus: ingestionArtifacts.rawFileStatus,
          rawFilePurgedAt: ingestionArtifacts.rawFilePurgedAt,
        })
        .from(ingestionArtifacts)
        .where(eq(ingestionArtifacts.id, artifactId)),
    ).resolves.toEqual([{ rawFileStatus: "RETAINED", rawFilePurgedAt: null }]);

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
      .where(
        and(
          eq(coverageAreas.id, coverageAreaId),
          eq(coverageAreas.name, "Retention test coverage"),
        ),
      );
    await rm(archiveRoot, { recursive: true, force: true });
  });
});
