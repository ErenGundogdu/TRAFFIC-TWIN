import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { TrafficEventContextRepository } from "./traffic-event-context-repository.js";
import { TrafficEventContextService } from "./traffic-event-context-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki metropol bölgesi",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

describe("TrafficEventContextService", () => {
  it("derives the road reference and returns versioned spatial evidence", async () => {
    const stationRepository = {
      findCoverageArea: vi.fn(async () => coverageArea),
      listStations: vi.fn(async () => [
        {
          id: "fintraffic-tms:20002",
          providerStationId: 20002,
          tmsNumber: 20002,
          name: "vt1_Espoo_Hirvisuo",
          longitude: 24.7,
          latitude: 60.2,
          bearing: 90,
        },
      ]),
    } as unknown as StationCatalogRepository;
    const contextRepository: TrafficEventContextRepository = {
      findCandidates: vi.fn(async () => []),
    };
    const service = new TrafficEventContextService(
      stationRepository,
      contextRepository,
      () => new Date("2026-09-15T08:00:00.000Z"),
    );

    const result = await service.getStationContext(
      "helsinki",
      "fintraffic-tms:20002",
    );

    expect(result).toMatchObject({
      station: { assetId: "fintraffic-tms:20002", roadRef: "1" },
      evaluatedAt: "2026-09-15T08:00:00.000Z",
      policy: { version: "station-event-context-v1" },
    });
    expect(contextRepository.findCandidates).toHaveBeenCalledWith({
      coverageAreaId: "helsinki",
      stationAssetId: "fintraffic-tms:20002",
      maximumDistanceMeters: 5_000,
    });
  });
});
