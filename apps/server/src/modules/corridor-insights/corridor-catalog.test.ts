import type {
  StationCatalogResponse,
  StationSummary,
} from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import type { StoredRoadContext } from "../road-context/road-context-repository.js";
import { createCorridorCatalog } from "./corridor-insight-service.js";

function station(id: string, tmsNumber: number): StationSummary {
  return {
    id,
    providerStationId: tmsNumber,
    tmsNumber,
    name: `Station ${tmsNumber}`,
    longitude: 24.8,
    latitude: 60.2,
    bearing: null,
    freshness: "FRESH",
    directions: [1, 2].map((direction) => ({
      direction: direction as 1 | 2,
      heading: null,
      averageSpeedKmh: 80,
      flowVehiclesPerHour: 100,
      measuredAt: "2026-09-24T09:00:00.000Z",
      trafficFlow: {
        status: "FREE_FLOW" as const,
        speedPercentOfFreeFlow: 95,
        flowPercentOfCapacity: 20,
        freeFlowSpeedKmh: 84,
        maximumFlowVehiclesPerHour: 500,
        policyVersion: "fintraffic-flow-v1" as const,
      },
    })) as StationSummary["directions"],
    lanes: [],
  };
}

function context(assetId: string, roadRef: string): StoredRoadContext {
  return {
    assetId,
    status: "MATCHED",
    roadRef,
    matchingPolicy: "osm-ref-nearest-bearing-v1",
    source: {
      id: "openstreetmap",
      attribution: "© OpenStreetMap contributors",
      licenseUrl: "https://www.openstreetmap.org/copyright",
      updatedAt: "2026-09-24T08:00:00.000Z",
      fetchedAt: "2026-09-24T08:00:00.000Z",
    },
    segments: [],
  };
}

describe("createCorridorCatalog", () => {
  it("keeps verified road groups with at least three stations", () => {
    const stations = [
      station("s-3", 3),
      station("s-1", 1),
      station("s-2", 2),
      station("s-4", 4),
      station("s-5", 5),
    ];
    const catalog = {
      coverageArea: {
        id: "helsinki",
        name: "Helsinki",
        timeZone: "Europe/Helsinki",
        bbox: [24, 60, 26, 61],
      },
      source: {
        id: "fintraffic-tms",
        name: "Fintraffic Digitraffic TMS",
        attribution: "Fintraffic",
        licenseUrl: "https://example.com",
        status: "AVAILABLE",
        updatedAt: "2026-09-24T09:00:00.000Z",
        fetchedAt: "2026-09-24T09:00:00.000Z",
      },
      stations,
    } satisfies StationCatalogResponse;

    const result = createCorridorCatalog(
      catalog,
      [
        context("s-3", "1"),
        context("s-1", "1"),
        context("s-2", "1"),
        context("s-4", "50"),
        context("s-5", "50"),
      ],
      new Date("2026-09-24T09:00:00.000Z"),
    );

    expect(result.corridors).toEqual([
      {
        id: "road:1",
        roadRef: "1",
        stationIds: ["s-1", "s-2", "s-3"],
      },
    ]);
  });
});
