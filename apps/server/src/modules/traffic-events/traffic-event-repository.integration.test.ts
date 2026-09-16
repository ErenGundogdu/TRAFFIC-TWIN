import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import { createDatabase } from "../../infrastructure/database/client.js";
import { coverageAreas } from "../../infrastructure/database/schema.js";
import { PostgresTrafficEventRepository } from "./traffic-event-repository.js";

describe("PostgresTrafficEventRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );

  afterAll(async () => connection.pool.end());

  it("atomically replaces a coverage snapshot and keeps source times", async () => {
    const coverageAreaId = `test-events-${randomUUID()}`;
    await connection.db.insert(coverageAreas).values({
      id: coverageAreaId,
      name: "Test coverage",
      timeZone: "Europe/Helsinki",
      minLongitude: 24.5,
      minLatitude: 60.1,
      maxLongitude: 25.25,
      maxLatitude: 60.45,
    });
    const repository = new PostgresTrafficEventRepository(connection.db);
    await repository.replaceCoverage(coverageAreaId, {
      sourceUpdatedAt: "2026-09-14T07:36:51.015Z",
      fetchedAt: "2026-09-14T07:40:00.000Z",
      events: [
        {
          id: `fintraffic-traffic-message:${coverageAreaId}`,
          providerEventId: coverageAreaId,
          category: "ROAD_WORK",
          status: "ACTIVE",
          severity: "HIGH",
          title: "Tie 1. Tietyö.",
          description: "Test location",
          comment: null,
          effects: ["Nopeusrajoitus"],
          direction: "BOTH",
          directionDescription: "Helsinki",
          sender: "Fintraffic Tieliikennekeskus Helsinki",
          language: "fi",
          geometry: {
            type: "LineString",
            coordinates: [
              [24.8, 60.2],
              [24.9, 60.2],
            ],
          },
          roadNumbers: [1],
          releaseTime: "2026-09-14T07:00:00.000Z",
          versionTime: "2026-09-14T07:30:00.000Z",
          startsAt: "2026-09-14T06:00:00.000Z",
          endsAt: null,
        },
      ],
    });

    await expect(repository.listCoverage(coverageAreaId)).resolves.toEqual({
      sourceUpdatedAt: "2026-09-14T07:36:51.015Z",
      fetchedAt: "2026-09-14T07:40:00.000Z",
      events: [
        expect.objectContaining({
          providerEventId: coverageAreaId,
          category: "ROAD_WORK",
          geometry: {
            type: "LineString",
            coordinates: [
              [24.8, 60.2],
              [24.9, 60.2],
            ],
          },
        }),
      ],
    });

    await connection.db
      .delete(coverageAreas)
      .where(eq(coverageAreas.id, coverageAreaId));
  });
});
