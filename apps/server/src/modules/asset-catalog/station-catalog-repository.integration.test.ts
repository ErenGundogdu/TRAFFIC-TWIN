import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import {
  createDatabase,
  type Database,
} from "../../infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "./station-catalog-repository.js";

describe("PostgresStationCatalogRepository", () => {
  const connection = createDatabase(
    parseEnv({ NODE_ENV: "test" }).DATABASE_URL,
  );
  let database: Database;

  beforeAll(() => {
    database = connection.db;
  });

  afterAll(async () => {
    await connection.pool.end();
  });

  it("persists a real station coordinate as a PostGIS point", async () => {
    const repository = new PostgresStationCatalogRepository(database);

    await repository.upsertStations(
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
              averageSpeedKmh: 93,
              flowVehiclesPerHour: 1488,
              measuredAt: "2026-09-04T09:03:35Z",
            },
            {
              direction: 2,
              label: "Yön 2",
              averageSpeedKmh: 103,
              flowVehiclesPerHour: 612,
              measuredAt: "2026-09-04T09:03:35Z",
            },
          ],
        },
      ],
      new Date("2026-09-04T06:55:13Z"),
    );

    const result = await database.execute<{ inside: boolean }>(sql`
      SELECT ST_Within(
        location,
        ST_MakeEnvelope(24.5, 60.1, 25.25, 60.45, 4326)
      ) AS inside
      FROM traffic_assets
      WHERE id = 'fintraffic-tms:20002'
    `);

    expect(result.rows[0]?.inside).toBe(true);
  });
});
