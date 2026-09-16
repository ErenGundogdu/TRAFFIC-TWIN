import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
  stationSensorConstantsCollectionSchema,
} from "../providers/fintraffic/schemas.js";
import { readFixture } from "../providers/fintraffic/test-fixtures.js";
import type {
  PersistedStation,
  StationCatalogRepository,
} from "./station-catalog-repository.js";
import { StationCatalogService } from "./station-catalog-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki metropol bölgesi",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

function createRepository(
  cachedStations: PersistedStation[] = [],
): StationCatalogRepository {
  return {
    findCoverageArea: vi.fn(async () => Promise.resolve(coverageArea)),
    listStations: vi.fn(async () => Promise.resolve(cachedStations)),
    upsertStations: vi.fn(async () => Promise.resolve()),
  };
}

describe("StationCatalogService", () => {
  it("returns and persists a normalized real Fintraffic snapshot", async () => {
    const repository = createRepository();
    const service = new StationCatalogService(
      repository,
      {
        getStations: vi.fn(async () =>
          Promise.resolve(
            stationFeatureCollectionSchema.parse(
              readFixture("stations.sample.json"),
            ),
          ),
        ),
        getCurrentStationData: vi.fn(async () =>
          Promise.resolve(
            stationDataCollectionSchema.parse(
              readFixture("station-data.sample.json"),
            ),
          ),
        ),
        getSensorConstants: vi.fn(async () =>
          stationSensorConstantsCollectionSchema.parse({
            dataUpdatedTime: "2026-09-04T06:00:00Z",
            stations: [
              {
                id: 20002,
                sensorConstantValues: [
                  {
                    name: "VVAPAAS1",
                    value: 100,
                    validFrom: "01-01",
                    validTo: "12-31",
                  },
                  {
                    name: "MS1",
                    value: 3600,
                    validFrom: "01-01",
                    validTo: "12-31",
                  },
                ],
              },
            ],
          }),
        ),
      },
      () => new Date("2026-09-04T09:04:00Z"),
    );

    const result = await service.getCoverageStations("helsinki");

    expect(result.source.status).toBe("AVAILABLE");
    expect(result.stations[0]?.directions[0]?.averageSpeedKmh).toBe(93);
    expect(result.stations[0]?.directions[0]?.heading).toEqual({
      degrees: 298,
      compassPoint: "NW",
      determination: "PROVIDER_REPORTED",
    });
    expect(result.stations[0]?.directions[0]?.trafficFlow).toMatchObject({
      status: "FREE_FLOW",
      speedPercentOfFreeFlow: 93,
      flowPercentOfCapacity: 41.3,
    });
    expect(repository.upsertStations).toHaveBeenCalledOnce();
  });

  it("keeps the persisted catalog visible without inventing measurements", async () => {
    const repository = createRepository([
      {
        id: "fintraffic-tms:20002",
        providerStationId: 20002,
        tmsNumber: 20002,
        name: "vt1_Espoo_Hirvisuo",
        longitude: 24.637997,
        latitude: 60.220898,
        bearing: 298,
      },
    ]);
    const service = new StationCatalogService(repository, {
      getStations: vi.fn(async () => Promise.reject(new Error("offline"))),
      getCurrentStationData: vi.fn(async () =>
        Promise.reject(new Error("offline")),
      ),
      getSensorConstants: vi.fn(async () =>
        Promise.reject(new Error("offline")),
      ),
    });

    const result = await service.getCoverageStations("helsinki");

    expect(result.source.status).toBe("DEGRADED");
    expect(result.stations[0]?.freshness).toBe("UNAVAILABLE");
    expect(result.stations[0]?.directions[0]?.averageSpeedKmh).toBeNull();
  });

  it("reconciles REST from the persisted snapshot without polling upstream", async () => {
    const repository = createRepository([
      {
        id: "fintraffic-tms:20002",
        providerStationId: 20002,
        tmsNumber: 20002,
        name: "vt1_Espoo_Hirvisuo",
        longitude: 24.637997,
        latitude: 60.220898,
        bearing: 298,
      },
    ]);
    const client = {
      getStations: vi.fn(),
      getCurrentStationData: vi.fn(),
      getSensorConstants: vi.fn(),
    };
    const service = new StationCatalogService(
      repository,
      client,
      () => new Date("2026-09-04T09:04:00Z"),
      {
        insertBatch: vi.fn(async () => 0),
        listLatestDirections: vi.fn(async () => [
          {
            assetId: "fintraffic-tms:20002",
            direction: 1 as const,
            measuredAt: "2026-09-04T09:03:35Z",
            averageSpeedKmh: 93,
            flowVehiclesPerHour: 1488,
            speedPercentOfFreeFlow: 93,
            flowPercentOfCapacity: 41,
            sourceUpdatedAt: "2026-09-04T09:03:35Z",
          },
        ]),
      },
    );

    const result = await service.getCoverageStations("helsinki");

    expect(result.source.status).toBe("AVAILABLE");
    expect(result.stations[0]?.directions[0]?.averageSpeedKmh).toBe(93);
    expect(result.stations[0]?.directions[1]?.averageSpeedKmh).toBeNull();
    expect(result.stations[0]?.directions[1]?.heading).toEqual({
      degrees: 118,
      compassPoint: "SE",
      determination: "DERIVED_OPPOSITE",
    });
    expect(client.getStations).not.toHaveBeenCalled();
    expect(client.getCurrentStationData).not.toHaveBeenCalled();
  });
});
