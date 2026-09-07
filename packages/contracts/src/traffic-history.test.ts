import { describe, expect, it } from "vitest";

import {
  historyAvailabilityResponseSchema,
  historyQuerySchema,
} from "./traffic-history.js";

const validQuery = {
  assetIds: ["fintraffic-tms:20002"],
  metric: "average-speed-kmh",
  direction: 1,
  from: "2026-09-02T21:00:00.000Z",
  to: "2026-09-03T21:00:00.000Z",
} as const;

describe("traffic history contracts", () => {
  it("applies the automatic resolution default to a valid query", () => {
    expect(historyQuerySchema.parse(validQuery).resolution).toBe("auto");
  });

  it("rejects duplicate assets and unbounded date ranges", () => {
    expect(
      historyQuerySchema.safeParse({
        ...validQuery,
        assetIds: [validQuery.assetIds[0], validQuery.assetIds[0]],
      }).success,
    ).toBe(false);

    expect(
      historyQuerySchema.safeParse({
        ...validQuery,
        to: "2027-09-10T21:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("validates history availability without accepting empty date lists", () => {
    const result = historyAvailabilityResponseSchema.parse({
      coverageAreaId: "helsinki",
      timeZone: "Europe/Helsinki",
      assets: [
        {
          assetId: "fintraffic-tms:20002",
          firstDate: "2026-09-03",
          lastDate: "2026-09-03",
          availableDayCount: 1,
          availableDates: ["2026-09-03"],
        },
      ],
    });

    expect(result.assets[0]?.availableDayCount).toBe(1);
    expect(
      historyAvailabilityResponseSchema.safeParse({
        ...result,
        assets: [{ ...result.assets[0], availableDates: [] }],
      }).success,
    ).toBe(false);
  });
});
