import { randomInt, randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { parseEnv } from "../../config/env.js";
import {
  createDatabase,
  type Database,
} from "../../infrastructure/database/client.js";
import { trafficAssets } from "../../infrastructure/database/schema.js";
import { PostgresStationCatalogRepository } from "./station-catalog-repository.js";
import { PostgresTrafficObservationRepository } from "../telemetry/traffic-observation-repository.js";

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

const knownTrafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 93,
  flowPercentOfCapacity: 41.3,
  freeFlowSpeedKmh: 100,
  maximumFlowVehiclesPerHour: 3_600,
  policyVersion: "fintraffic-flow-v1" as const,
};

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
    const stationId = `test-flow-profile-${randomUUID()}`;
    const providerStationId = randomInt(1_000_000_000, 2_000_000_000);

    await repository.upsertStations(
      "helsinki",
      [
        {
          id: stationId,
          providerStationId,
          tmsNumber: providerStationId,
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
              averageSpeedKmh: 93,
              flowVehiclesPerHour: 1488,
              measuredAt: "2026-09-04T09:03:35Z",
              trafficFlow: knownTrafficFlow,
            },
            {
              direction: 2,
              heading: {
                degrees: 118,
                compassPoint: "SE",
                determination: "DERIVED_OPPOSITE",
              },
              averageSpeedKmh: 103,
              flowVehiclesPerHour: 612,
              measuredAt: "2026-09-04T09:03:35Z",
              trafficFlow: unknownTrafficFlow,
            },
          ],
          lanes: [],
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
      WHERE id = ${stationId}
    `);

    expect(result.rows[0]?.inside).toBe(true);
    await expect(repository.listStations("helsinki")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: stationId,
          directionProfiles: expect.arrayContaining([
            expect.objectContaining({
              direction: 1,
              freeFlowSpeedKmh: 100,
              maximumFlowVehiclesPerHour: 3_600,
            }),
          ]),
        }),
      ]),
    );
    await database.delete(trafficAssets).where(eq(trafficAssets.id, stationId));
  });

  it("writes the same fixed-window observation idempotently", async () => {
    await database.execute(sql`
      DELETE FROM traffic_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND measured_at = '2026-09-04T09:03:35Z'
    `);
    await database.execute(sql`
      DELETE FROM traffic_lane_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND measured_at = '2026-09-04T09:03:35Z'
    `);

    const stations = [
      {
        id: "fintraffic-tms:20002",
        providerStationId: 20002,
        tmsNumber: 20002,
        name: "vt1_Espoo_Hirvisuo",
        longitude: 24.637997,
        latitude: 60.220898,
        bearing: 298,
        freshness: "FRESH" as const,
        directions: [
          {
            direction: 1 as const,
            heading: {
              degrees: 298,
              compassPoint: "NW" as const,
              determination: "PROVIDER_REPORTED" as const,
            },
            averageSpeedKmh: 93,
            flowVehiclesPerHour: 1488,
            measuredAt: "2026-09-04T09:03:35Z",
            trafficFlow: knownTrafficFlow,
          },
          {
            direction: 2 as const,
            heading: {
              degrees: 118,
              compassPoint: "SE" as const,
              determination: "DERIVED_OPPOSITE" as const,
            },
            averageSpeedKmh: 103,
            flowVehiclesPerHour: 612,
            measuredAt: "2026-09-04T09:03:35Z",
            trafficFlow: unknownTrafficFlow,
          },
        ],
        lanes: [
          {
            lane: 1,
            direction: null,
            directionEvidence: null,
            averageSpeedKmh: 91,
            flowVehiclesPerHour: 516,
            flowWindow: "ROLLING_5_MINUTES" as const,
            measuredAt: "2026-09-04T09:03:35Z",
          },
        ],
      },
    ];
    const repository = new PostgresTrafficObservationRepository(database);
    const sourceUpdatedAt = new Date("2026-09-04T09:03:35Z");

    expect(await repository.insertBatch(stations, sourceUpdatedAt)).toBe(2);
    expect(await repository.insertBatch(stations, sourceUpdatedAt)).toBe(0);

    const result = await database.execute<{
      count: string;
      speedPercent: number | null;
    }>(sql`
      SELECT
        COUNT(*)::text AS count,
        MAX(speed_percent_of_free_flow) AS "speedPercent"
      FROM traffic_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND measured_at = '2026-09-04T09:03:35Z'
    `);
    expect(result.rows[0]?.count).toBe("2");
    expect(result.rows[0]?.speedPercent).toBe(93);
    const laneResult = await database.execute<{
      averageSpeedKmh: number | null;
      flowVehiclesPerHour: number | null;
    }>(sql`
      SELECT
        average_speed_kmh AS "averageSpeedKmh",
        flow_vehicles_per_hour AS "flowVehiclesPerHour"
      FROM traffic_lane_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND lane = 1
        AND measured_at = '2026-09-04T09:03:35Z'
    `);
    expect(laneResult.rows[0]).toEqual({
      averageSpeedKmh: 91,
      flowVehiclesPerHour: 516,
    });

    await database.execute(sql`
      DELETE FROM traffic_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND measured_at = '2026-09-04T09:03:35Z'
    `);
    await database.execute(sql`
      DELETE FROM traffic_lane_observations
      WHERE asset_id = 'fintraffic-tms:20002'
        AND measured_at = '2026-09-04T09:03:35Z'
    `);
  });
});
