import { describe, expect, it } from "vitest";

import { trafficCompositionBreakdownSchema } from "./traffic-composition.js";

describe("traffic composition contracts", () => {
  it("validates sparse count and speed totals", () => {
    expect(
      trafficCompositionBreakdownSchema.parse({
        "1:4": { vehicleCount: 12, speedTotalKmh: 864 },
      }),
    ).toEqual({
      "1:4": { vehicleCount: 12, speedTotalKmh: 864 },
    });
  });

  it("rejects negative counts and speed totals", () => {
    expect(
      trafficCompositionBreakdownSchema.safeParse({
        "1": { vehicleCount: -1, speedTotalKmh: 10 },
      }).success,
    ).toBe(false);
  });
});
