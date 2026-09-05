import { describe, expect, it } from "vitest";

import { axisBearingDifference, deriveJunctions } from "./junction-matching.js";

const candidate = {
  osmRelationId: "11264073",
  name: "Kavşak 11",
  longitude: 24.8095079,
  latitude: 60.3546718,
  roadRefs: ["3"],
  sourceUpdatedAt: "2026-09-05T17:16:06Z",
};

describe("junction matching policy", () => {
  it("derives the real Vantaa junction group from road-compatible sensors", () => {
    const result = deriveJunctions(
      "helsinki",
      [candidate],
      [
        {
          id: "fintraffic-tms:20027",
          providerStationId: 20027,
          tmsNumber: 20027,
          name: "vt3_Peräjä_Hki",
          longitude: 24.808669,
          latitude: 60.353774,
          bearing: null,
        },
        {
          id: "fintraffic-tms:23005",
          providerStationId: 23005,
          tmsNumber: 5,
          name: "vt3_Klaukkalantie",
          longitude: 24.808791,
          latitude: 60.354656,
          bearing: 335,
        },
        {
          id: "fintraffic-tms:20021",
          providerStationId: 20021,
          tmsNumber: 20021,
          name: "vt3_Kotamäki_HML",
          longitude: 24.809478,
          latitude: 60.350625,
          bearing: null,
        },
      ],
      new Date("2026-09-05T17:20:00Z"),
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "openstreetmap:junction:11264073",
      coverage: "FULL",
      roadRefs: ["3"],
    });
    expect(result[0]?.matches).toHaveLength(3);
  });

  it("treats opposite directions as the same road axis", () => {
    expect(axisBearingDifference(350, 170)).toBe(0);
    expect(axisBearingDifference(10, 350)).toBe(20);
  });

  it("assigns a sensor only to its closest compatible junction", () => {
    const station = {
      id: "fintraffic-tms:20027",
      providerStationId: 20027,
      tmsNumber: 20027,
      name: "vt3_Peräjä_Hki",
      longitude: 24.808669,
      latitude: 60.353774,
      bearing: null,
    };
    const result = deriveJunctions(
      "helsinki",
      [
        candidate,
        {
          ...candidate,
          osmRelationId: "999",
          latitude: 60.36,
        },
      ],
      [station],
      new Date("2026-09-05T17:20:00Z"),
    );

    expect(result.map((junction) => junction.osmRelationId)).toEqual([
      "11264073",
    ]);
  });
});
