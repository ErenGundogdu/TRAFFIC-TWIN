import { describe, expect, it } from "vitest";

import { resolveHistoryResolutions } from "./history-resolution-policy.js";

const policy = {
  minuteRetentionDays: 7,
  hourRetentionDays: 730,
  dayRetentionDays: 1_825,
};

describe("resolveHistoryResolutions", () => {
  it.each([
    ["2026-09-14", ["minute", "hour", "day"]],
    ["2026-09-13", ["hour", "day"]],
    ["2024-09-21", ["hour", "day"]],
    ["2024-09-20", ["day"]],
    ["2021-09-22", ["day"]],
    ["2021-09-21", []],
  ] as const)("selects retained resolutions for %s", (sourceDate, expected) => {
    expect(resolveHistoryResolutions(sourceDate, "2026-09-21", policy)).toEqual(
      expected,
    );
  });
});
