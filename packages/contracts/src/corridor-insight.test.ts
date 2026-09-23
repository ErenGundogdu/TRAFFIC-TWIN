import { describe, expect, it } from "vitest";

import { corridorInsightResponseSchema } from "./corridor-insight.js";

describe("corridor insight contract", () => {
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
