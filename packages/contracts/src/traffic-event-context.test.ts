import { describe, expect, it } from "vitest";

import { stationTrafficEventContextResponseSchema } from "./traffic-event-context.js";

describe("stationTrafficEventContextResponseSchema", () => {
  it("accepts an evidence-backed same-road match", () => {
    const result = stationTrafficEventContextResponseSchema.parse({
      station: { assetId: "fintraffic-tms:20002", roadRef: "1" },
      evaluatedAt: "2026-09-15T08:00:00.000Z",
      policy: {
        version: "station-event-context-v1",
        nearbyMaxDistanceMeters: 1_000,
        sameRoadMaxDistanceMeters: 5_000,
        maximumResults: 8,
      },
      matches: [
        {
          relation: "SAME_ROAD_NEARBY",
          distanceMeters: 640,
          roadMatch: true,
          matchedRoadNumber: 1,
          event: {
            id: "fintraffic-traffic-message:GUID1",
            providerEventId: "GUID1",
            category: "ROAD_WORK",
            status: "ACTIVE",
            severity: "HIGH",
            title: "Tie 1, Espoo. Tietyö.",
            description: "Turunväylä",
            comment: null,
            effects: ["Nopeusrajoitus"],
            direction: "BOTH",
            directionDescription: null,
            sender: "Fintraffic",
            language: "fi",
            geometry: { type: "Point", coordinates: [24.7, 60.2] },
            roadNumbers: [1],
            releaseTime: "2026-09-15T07:00:00.000Z",
            versionTime: "2026-09-15T07:30:00.000Z",
            startsAt: "2026-09-15T06:00:00.000Z",
            endsAt: null,
          },
        },
      ],
    });

    expect(result.matches[0]?.relation).toBe("SAME_ROAD_NEARBY");
  });
});
