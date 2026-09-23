import { randomInt, randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import { PostgresRoadContextRepository } from "./road-context-repository.js";

describe("PostgresRoadContextRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("persists the last source-traceable OSM road context", async () => {
    const coverageAreaId = `test-road-context-${randomUUID()}`;
    const assetId = `test-road-context-asset-${randomUUID()}`;
    const providerStationId = randomInt(1_000_000_000, 2_000_000_000);
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
      provider: "fintraffic-tms",
      providerStationId,
      tmsNumber: providerStationId,
      kind: "sensor-station",
      name: "vt1_Espoo_Hirvisuo",
      location: sql`ST_SetSRID(ST_MakePoint(24.637997, 60.220898), 4326)`,
      bearing: 298,
      collecting: true,
      capabilities: ["speed", "volume", "directional-flow"],
    });

    const repository = new PostgresRoadContextRepository(connection.db);
    await repository.upsert({
      assetId,
      status: "MATCHED",
      roadRef: "1",
      matchingPolicy: "osm-ref-nearest-bearing-v1",
      source: {
        id: "openstreetmap",
        attribution: "© OpenStreetMap contributors",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        updatedAt: "2026-09-07T12:31:06.000Z",
        fetchedAt: "2026-09-07T13:00:00.000Z",
      },
      segments: [
        {
          id: "openstreetmap:way:4218023",
          osmWayId: "4218023",
          name: "Turunväylä",
          roadRef: "1",
          highwayClass: "motorway",
          direction: 1,
          distanceMeters: 16,
          coordinates: [
            [24.6373727, 60.2209753],
            [24.6382883, 60.2208906],
          ],
        },
      ],
    });

    await expect(repository.findByAssetId(assetId)).resolves.toMatchObject({
      assetId,
      status: "MATCHED",
      source: {
        updatedAt: "2026-09-07T12:31:06.000Z",
        fetchedAt: "2026-09-07T13:00:00.000Z",
      },
      segments: [expect.objectContaining({ osmWayId: "4218023" })],
    });
    await expect(repository.findMatchedByRoadRef("1")).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ assetId })]),
    );

    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, assetId));
    await connection.db
      .delete(coverageAreas)
      .where(eq(coverageAreas.id, coverageAreaId));
  });
});
