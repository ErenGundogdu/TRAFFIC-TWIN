import { describe, expect, it } from "vitest";

import {
  corridorCatalogResponseSchema,
  corridorInsightResponseSchema,
} from "./corridor-insight.js";

describe("corridor insight contract", () => {
  it("validates a verified corridor catalog", () => {
    const parsed = corridorCatalogResponseSchema.parse({
      coverageAreaId: "helsinki",
      generatedAt: "2026-09-24T09:00:00.000Z",
      policyVersion: "verified-road-corridor-catalog-v1",
      minimumStationCount: 3,
      corridors: [
        {
          id: "road:1",
          roadRef: "1",
          stationIds: ["station-1", "station-2", "station-3"],
        },
      ],
      source: {
        roadNetwork: "OpenStreetMap",
        traffic: "Fintraffic TMS",
      },
    });

    expect(parsed.corridors[0]?.stationIds).toHaveLength(3);
  });

  it("keeps verified road scope and comparable live readings explicit", () => {
    const parsed = corridorInsightResponseSchema.parse({
      assetId: "fintraffic-tms:23005",
      roadRef: "3",
      roadContextStatus: "MATCHED",
      roadContextFreshness: "FRESH",
      generatedAt: "2026-09-22T18:00:00.000Z",
      policyVersion: "verified-road-live-corridor-v1",
      source: { roadNetwork: "OpenStreetMap", traffic: "Fintraffic TMS" },
      directions: [1, 2].map((direction) => ({
        direction,
        status: "INSUFFICIENT_DATA",
        selected: null,
        peers: [],
        peerMedianSpeedPercentOfFreeFlow: null,
        selectedDifferencePercentagePoints: null,
      })),
    });

    expect(parsed.roadRef).toBe("3");
    expect(parsed.directions).toHaveLength(2);
  });
});
