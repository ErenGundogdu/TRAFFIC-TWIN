import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
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
  it("returns and caches canonical OSM road context", async () => {
    const getRoadContext = vi.fn(async () => ({
      sourceUpdatedAt: "2026-09-07T12:31:06.000Z",
      segments: [],
    }));
    const service = new RoadContextService(
      stationRepository,
      { getRoadContext },
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
      roadRef: "1",
      matchingPolicy: "osm-ref-nearest-bearing-v1",
    });
    expect(getRoadContext).toHaveBeenCalledTimes(1);
  });
});
