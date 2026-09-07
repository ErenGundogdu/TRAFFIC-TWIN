import { describe, expect, it } from "vitest";

import { classifyMeasurementFreshness } from "./classify-measurement-freshness.js";

const now = new Date("2026-09-07T07:00:00Z");

describe("classifyMeasurementFreshness", () => {
  it.each([
    ["2026-09-07T06:56:00Z", "FRESH"],
    ["2026-09-07T06:50:00Z", "STALE"],
    ["2026-09-07T06:40:00Z", "OUTDATED"],
    [null, "UNAVAILABLE"],
  ] as const)("classifies %s as %s", (measuredAt, expected) => {
    expect(classifyMeasurementFreshness(measuredAt, now)).toBe(expected);
  });
});
