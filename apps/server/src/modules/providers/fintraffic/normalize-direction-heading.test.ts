import { describe, expect, it } from "vitest";

import { normalizeDirectionHeading } from "./normalize-direction-heading.js";

describe("normalizeDirectionHeading", () => {
  it("uses the provider bearing for direction one", () => {
    expect(normalizeDirectionHeading(298, 1)).toEqual({
      degrees: 298,
      compassPoint: "NW",
      determination: "PROVIDER_REPORTED",
    });
  });

  it("derives the opposite heading for direction two", () => {
    expect(normalizeDirectionHeading(298, 2)).toEqual({
      degrees: 118,
      compassPoint: "SE",
      determination: "DERIVED_OPPOSITE",
    });
  });

  it("normalizes north and preserves missing source data", () => {
    expect(normalizeDirectionHeading(360, 1)?.degrees).toBe(0);
    expect(normalizeDirectionHeading(null, 2)).toBeNull();
  });
});
