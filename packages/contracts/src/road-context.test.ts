import { describe, expect, it } from "vitest";

import { stationRoadContextSchema } from "./road-context.js";

describe("station road context contract", () => {
  it("validates sourced OSM geometry and explicit no-match state", () => {
    const result = stationRoadContextSchema.parse({
      assetId: "fintraffic-tms:20002",
      status: "MATCHED",
      freshness: "FRESH",
      roadRef: "1",
      matchingPolicy: "osm-ref-nearest-bearing-v1",
      source: {
        id: "openstreetmap",
        attribution: "© OpenStreetMap contributors",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        updatedAt: "2026-09-07T12:31:06.000Z",
        fetchedAt: "2026-09-07T13:00:00.000Z",
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
    });

    expect(result.segments[0]?.direction).toBe(1);
    expect(
      stationRoadContextSchema.safeParse({
        ...result,
        segments: [{ ...result.segments[0], coordinates: [[24, 60]] }],
      }).success,
    ).toBe(false);
  });
});
