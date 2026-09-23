import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type {
  RoadContextRepository,
  StoredRoadContext,
} from "./road-context-repository.js";
import { RoadContextService } from "./road-context-service.js";

const stationRepository = {
  findCoverageArea: vi.fn(async () => ({
    id: "helsinki",
    name: "Helsinki",
    timeZone: "Europe/Helsinki",
    bbox: [24.5, 60.1, 25.25, 60.45] as [number, number, number, number],
  })),
  listStations: vi.fn(async () => [
    {
      id: "fintraffic-tms:20002",
      providerStationId: 20002,
      tmsNumber: 20002,
      name: "vt1_Espoo_Hirvisuo",
      longitude: 24.637997,
      latitude: 60.220898,
      bearing: 298,
    },
  ]),
  upsertStations: vi.fn(async () => undefined),
} satisfies StationCatalogRepository;

describe("RoadContextService", () => {
  it("persists and caches a canonical OSM road context", async () => {
    const getRoadContext = vi.fn(async () => ({
      sourceUpdatedAt: "2026-09-07T12:31:06.000Z",
      segments: [],
    }));
    const repository = createRepository(null);
    const service = new RoadContextService(
      stationRepository,
      { getRoadContext },
      repository,
      () => new Date("2026-09-07T13:00:00.000Z"),
    );

    const first = await service.getStationRoadContext(
      "helsinki",
      "fintraffic-tms:20002",
    );
    const second = await service.getStationRoadContext(
      "helsinki",
      "fintraffic-tms:20002",
    );

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: "NO_MATCH",
      freshness: "FRESH",
      roadRef: "1",
      matchingPolicy: "osm-ref-nearest-bearing-v1",
    });
    expect(getRoadContext).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledTimes(1);
  });

  it("returns a fresh persisted value without calling Overpass", async () => {
    const getRoadContext = vi.fn();
    const repository = createRepository(
      createStoredRoadContext("2026-09-07T12:00:00.000Z"),
    );
    const service = new RoadContextService(
      stationRepository,
      { getRoadContext },
      repository,
      () => new Date("2026-09-07T13:00:00.000Z"),
    );

    await expect(
      service.getStationRoadContext("helsinki", "fintraffic-tms:20002"),
    ).resolves.toMatchObject({ freshness: "FRESH", status: "MATCHED" });
    expect(getRoadContext).not.toHaveBeenCalled();
  });

  it("falls back to the last value and backs off failed refreshes", async () => {
    const getRoadContext = vi.fn(async () => {
      throw new Error("Overpass unavailable");
    });
    const repository = createRepository(
      createStoredRoadContext("2026-09-05T12:00:00.000Z"),
    );
    const onRefreshError = vi.fn();
    const service = new RoadContextService(
      stationRepository,
      { getRoadContext },
      repository,
      () => new Date("2026-09-07T13:00:00.000Z"),
      onRefreshError,
    );

    const first = await service.getStationRoadContext(
      "helsinki",
      "fintraffic-tms:20002",
    );
    const second = await service.getStationRoadContext(
      "helsinki",
      "fintraffic-tms:20002",
    );

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      freshness: "STALE",
      source: { fetchedAt: "2026-09-05T12:00:00.000Z" },
    });
    expect(getRoadContext).toHaveBeenCalledTimes(1);
    expect(repository.upsert).not.toHaveBeenCalled();
    expect(onRefreshError).toHaveBeenCalledTimes(1);
  });
});

function createRepository(value: StoredRoadContext | null) {
  return {
    findByAssetId: vi.fn(async () => value),
    findMatchedByRoadRef: vi.fn(async () => (value ? [value] : [])),
    upsert: vi.fn(async () => undefined),
  } satisfies RoadContextRepository;
}

function createStoredRoadContext(fetchedAt: string): StoredRoadContext {
  return {
    assetId: "fintraffic-tms:20002",
    status: "MATCHED",
    roadRef: "1",
    matchingPolicy: "osm-ref-nearest-bearing-v1",
    source: {
      id: "openstreetmap",
      attribution: "© OpenStreetMap contributors",
      licenseUrl: "https://www.openstreetmap.org/copyright",
      updatedAt: "2026-09-05T11:59:00.000Z",
      fetchedAt,
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
  };
}
