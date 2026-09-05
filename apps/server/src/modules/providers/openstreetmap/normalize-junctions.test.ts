import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeOsmJunctions } from "./normalize-junctions.js";
import { overpassJunctionResponseSchema } from "./schemas.js";

describe("normalizeOsmJunctions", () => {
  it("preserves the real OSM relation and derives its member road refs", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("./__fixtures__/junction.sample.json", import.meta.url),
        "utf8",
      ),
    );

    expect(
      normalizeOsmJunctions(overpassJunctionResponseSchema.parse(fixture)),
    ).toEqual([
      {
        osmRelationId: "11264073",
        name: "Kavşak 11",
        longitude: 24.8095079,
        latitude: 60.3546718,
        roadRefs: ["3"],
        sourceUpdatedAt: "2026-09-05T17:16:06Z",
      },
    ]);
  });
});
