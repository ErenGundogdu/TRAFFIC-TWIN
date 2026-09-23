import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryImportJobRepository } from "./history-import-job-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("HistoryImportJobRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );
  const repository = new HistoryImportJobRepository(connection.db);
  const createdIds: string[] = [];

  afterAll(async () => {
    await repository.deleteForTests(createdIds);
    await connection.pool.end();
  });

  it("claims one persistent job and records canonical partial progress", async () => {
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
      new Date("2026-09-01T00:00:00Z"),
    );
    const id = randomUUID();
    createdIds.push(id);
    const input = {
      id,
      coverageAreaId: "helsinki",
      assetId: "fintraffic-tms:20002",
      fromDate: "2020-02-01",
      toDate: "2020-02-02",
      requestedDayCount: 2,
      sourceDates: ["2020-02-01", "2020-02-02"],
    };

    await expect(repository.create(input)).resolves.toMatchObject({
      id,
      status: "QUEUED",
    });
    await expect(
      repository.create({ ...input, id: randomUUID() }),
    ).resolves.toBeNull();

    await expect(repository.claimNext()).resolves.toMatchObject({
      id,
      status: "RUNNING",
    });
    await repository.setCurrentSourceDate(id, "2020-02-01");
    await repository.recordDayOutcome(id, "SUCCESS");
    await repository.setCurrentSourceDate(id, "2020-02-02");
    await repository.recordDayOutcome(id, "FAILED");
    await repository.complete(id);

    await expect(repository.findById("helsinki", id)).resolves.toMatchObject({
      status: "PARTIAL_FAILURE",
      completedDayCount: 2,
      successfulDayCount: 1,
      failedDayCount: 1,
      skippedDayCount: 0,
      currentSourceDate: null,
      completedAt: expect.any(Date),
    });
  });

  it("claims an interactive job before an older rolling coverage job", async () => {
    const backgroundId = randomUUID();
    const interactiveId = randomUUID();
    createdIds.push(backgroundId, interactiveId);

    await repository.create({
      id: backgroundId,
      coverageAreaId: "helsinki",
      assetId: "fintraffic-tms:20002",
      fromDate: "2020-03-01",
      toDate: "2020-03-01",
      requestedDayCount: 1,
      sourceDates: ["2020-03-01"],
      purpose: "ROLLING_COVERAGE",
      priority: 10,
    });
    await repository.create({
      id: interactiveId,
      coverageAreaId: "helsinki",
      assetId: "fintraffic-tms:20002",
      fromDate: "2020-04-01",
      toDate: "2020-04-01",
      requestedDayCount: 1,
      sourceDates: ["2020-04-01"],
      purpose: "INTERACTIVE",
      priority: 100,
    });

    await expect(repository.claimNext()).resolves.toMatchObject({
      id: interactiveId,
      purpose: "INTERACTIVE",
      priority: 100,
    });
    await repository.fail(interactiveId);
    await expect(repository.claimNext()).resolves.toMatchObject({
      id: backgroundId,
      purpose: "ROLLING_COVERAGE",
      priority: 10,
    });
    await repository.fail(backgroundId);
  });
});
