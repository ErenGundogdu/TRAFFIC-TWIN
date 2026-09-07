import { describe, expect, it } from "vitest";

import {
  historyAvailabilityResponseSchema,
  historyQuerySchema,
  historySummarySchema,
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

  it("validates an explicit period summary", () => {
    const summary = historySummarySchema.parse({
      assetId: "fintraffic-tms:20002",
      assetName: "vt1_Espoo_Hirvisuo",
      direction: 1,
      bucketCount: 60,
      sampleCount: 180,
      averageSpeedKmh: 78.4,
      medianSpeedKmh: 79.1,
      minimumSpeedKmh: 54.2,
      minimumSpeedAt: "2026-09-03T05:42:00.000Z",
      maximumSpeedKmh: 91.3,
      maximumSpeedAt: "2026-09-03T02:15:00.000Z",
      totalVehicleCount: 180,
      averageVehicleCountPerBucket: 3,
      peakVehicleCount: 8,
      peakVehicleAt: "2026-09-03T05:45:00.000Z",
      speedAtPeakVehicleCountKmh: 58.6,
      directionDistribution: {
        directionOneVehicleCount: 180,
        directionTwoVehicleCount: 220,
        directionOnePercent: 45,
        directionTwoPercent: 55,
      },
    });

    expect(summary.directionDistribution.directionTwoPercent).toBe(55);
    expect(
      historySummarySchema.safeParse({
        ...summary,
        averageSpeedKmh: -1,
      }).success,
    ).toBe(false);
    expect(
      historySummarySchema.safeParse({
        ...summary,
        directionDistribution: {
          ...summary.directionDistribution,
          directionOnePercent: 101,
        },
      }).success,
    ).toBe(false);
  });
});
