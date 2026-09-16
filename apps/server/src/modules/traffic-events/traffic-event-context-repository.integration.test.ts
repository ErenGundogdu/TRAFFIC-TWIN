import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import { PostgresTrafficEventContextRepository } from "./traffic-event-context-repository.js";
import { PostgresTrafficEventRepository } from "./traffic-event-repository.js";

describe("PostgresTrafficEventContextRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("measures the station distance to the real event geometry", async () => {
    const suffix = randomUUID();
    const providerStationId = Number.parseInt(suffix.slice(0, 7), 16);
    const coverageAreaId = `test-event-context-${suffix}`;
    const stationAssetId = `test-station-${suffix}`;
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
      id: stationAssetId,
      coverageAreaId,
      provider: "fintraffic-tms",
      providerStationId,
      tmsNumber: providerStationId,
      kind: "sensor-station",
      name: "vt1_Test_station",
      location: sql`ST_SetSRID(ST_MakePoint(24.8, 60.2), 4326)`,
      bearing: 90,
      collecting: true,
      capabilities: ["speed", "volume"],
    });
    await new PostgresTrafficEventRepository(connection.db).replaceCoverage(
      coverageAreaId,
      {
        sourceUpdatedAt: "2026-09-15T07:30:00.000Z",
        fetchedAt: "2026-09-15T07:31:00.000Z",
        events: [
          {
            id: `fintraffic-traffic-message:${suffix}`,
            providerEventId: suffix,
            category: "ROAD_WORK",
            status: "ACTIVE",
            severity: "HIGH",
            title: "Tie 1. Tietyö.",
            description: null,
            comment: null,
            effects: [],
            direction: "BOTH",
            directionDescription: null,
            sender: "Fintraffic",
            language: "fi",
            geometry: {
              type: "LineString",
              coordinates: [
                [24.79, 60.201],
                [24.81, 60.201],
              ],
            },
            roadNumbers: [1],
            releaseTime: "2026-09-15T07:00:00.000Z",
            versionTime: "2026-09-15T07:30:00.000Z",
            startsAt: "2026-09-15T06:00:00.000Z",
            endsAt: null,
          },
        ],
      },
    );

    const candidates = await new PostgresTrafficEventContextRepository(
      connection.db,
    ).findCandidates({
      coverageAreaId,
      stationAssetId,
      maximumDistanceMeters: 1_000,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      event: { providerEventId: suffix },
    });
    expect(candidates[0]!.distanceMeters).toBeGreaterThan(100);
    expect(candidates[0]!.distanceMeters).toBeLessThan(120);

    await connection.db
      .delete(trafficAssets)
      .where(eq(trafficAssets.id, stationAssetId));
    await connection.db
      .delete(coverageAreas)
      .where(eq(coverageAreas.id, coverageAreaId));
  });
});
