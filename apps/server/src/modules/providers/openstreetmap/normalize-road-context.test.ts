import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeRoadContext } from "./normalize-road-context.js";
import { overpassRoadResponseSchema } from "./schemas.js";

describe("normalizeRoadContext", () => {
  it("matches real nearby OSM ways by the Fintraffic road reference", () => {
    const payload = overpassRoadResponseSchema.parse(
      JSON.parse(
        readFileSync(
          new URL("./__fixtures__/road-context.sample.json", import.meta.url),
          "utf8",
        ),
      ),
    );

    const segments = normalizeRoadContext(
      payload,
      { longitude: 24.637997, latitude: 60.220898, bearing: 298 },
      "1",
    );

    expect(segments).toHaveLength(2);
    expect(segments.map((segment) => segment.osmWayId)).toEqual([
      "4218023",
      "25562214",
    ]);
    expect(segments.map((segment) => segment.direction).sort()).toEqual([1, 2]);
    expect(segments.every((segment) => segment.roadRef === "1")).toBe(true);
  });
});
