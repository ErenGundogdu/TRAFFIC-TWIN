import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  derivedJunctions,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { PostgresJunctionCatalogRepository } from "./junction-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("PostgresJunctionCatalogRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("persists PostGIS geometry, provenance and sensor matching evidence", async () => {
    const suffix = randomUUID();
    const coverageAreaId = `test-junction-${suffix}`;
    const stationId = `test-station-${suffix}`;
    const junctionId = `test-junction-asset-${suffix}`;
    await connection.db.insert(coverageAreas).values({
      id: coverageAreaId,
      name: "Test coverage",
      timeZone: "Europe/Helsinki",
      minLongitude: 24.8,
      minLatitude: 60.3,
      maxLongitude: 24.9,
      maxLatitude: 60.4,
    });
    await new PostgresStationCatalogRepository(connection.db).upsertStations(
      coverageAreaId,
      [
        {
          id: stationId,
          providerStationId: 2_100_000_000,
          tmsNumber: 2_100_000_000,
          name: "vt3_Test",
          longitude: 24.808791,
          latitude: 60.354656,
          bearing: 335,
          freshness: "UNAVAILABLE",
          directions: [
            {
              direction: 1,
              heading: {
                degrees: 335,
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
                degrees: 155,
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
      new Date("2026-09-05T17:16:06Z"),
    );
    const repository = new PostgresJunctionCatalogRepository(connection.db);
    await repository.replaceCoverage(coverageAreaId, [
      {
        id: junctionId,
        coverageAreaId,
        osmRelationId: "11264073",
        name: "Kavşak 11",
        longitude: 24.8095079,
        latitude: 60.3546718,
        roadRefs: ["3"],
        coverage: "INSUFFICIENT",
        policyVersion: "integration-v1",
        sourceUpdatedAt: new Date("2026-09-05T17:16:06Z"),
        sourceFetchedAt: new Date("2026-09-05T17:20:00Z"),
        matches: [
          {
            stationAssetId: stationId,
            roadRef: "3",
            distanceMeters: 40,
            bearingDifferenceDegrees: 67,
            confidence: "HIGH",
          },
        ],
      },
    ]);

    const result = await repository.listCoverage(coverageAreaId);
    expect(result).toMatchObject({
      fetchedAt: "2026-09-05T17:20:00.000Z",
      junctions: [
        {
          id: junctionId,
          longitude: 24.8095079,
          latitude: 60.3546718,
          sensors: [{ assetId: stationId, confidence: "HIGH" }],
        },
      ],
    });

    await connection.db
      .delete(derivedJunctions)
      .where(eq(derivedJunctions.id, junctionId));
    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, stationId));
    await connection.db
      .delete(coverageAreas)
      .where(eq(coverageAreas.id, coverageAreaId));
  });
});
