import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
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
      },
      () => new Date("2026-09-04T09:04:00Z"),
    );

    const result = await service.getCoverageStations("helsinki");

    expect(result.source.status).toBe("AVAILABLE");
    expect(result.stations[0]?.directions[0]?.averageSpeedKmh).toBe(93);
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
    });

    const result = await service.getCoverageStations("helsinki");

    expect(result.source.status).toBe("DEGRADED");
    expect(result.stations[0]?.freshness).toBe("UNAVAILABLE");
    expect(result.stations[0]?.directions[0]?.averageSpeedKmh).toBeNull();
  });
});
