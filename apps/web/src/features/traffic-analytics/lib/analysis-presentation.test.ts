import type { HistoryResponse, HistorySummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { createAnalysisPresentation } from "./analysis-presentation";

const summary: HistorySummary = {
  assetId: "fintraffic-tms:20002",
  assetName: "Hirvisuo",
  direction: 1,
  bucketCount: 24,
  sampleCount: 72,
  averageSpeedKmh: 84,
  medianSpeedKmh: 85,
  minimumSpeedKmh: 61,
  minimumSpeedAt: "2026-09-03T05:00:00.000Z",
  maximumSpeedKmh: 96,
  maximumSpeedAt: "2026-09-03T01:00:00.000Z",
  totalVehicleCount: 1200,
  averageVehicleCountPerBucket: 50,
  peakVehicleCount: 92,
  peakVehicleAt: "2026-09-03T14:00:00.000Z",
  speedAtPeakVehicleCountKmh: 68,
  directionDistribution: {
    directionOneVehicleCount: 1200,
    directionTwoVehicleCount: 1000,
    directionOnePercent: 54.5,
    directionTwoPercent: 45.5,
  },
  composition: {
    classifiedVehicleCount: 0,
    classificationCoveragePercent: null,
    vehicleClasses: [],
    lanes: [],
    laneVehicleClasses: [],
    freightProxy: {
      vehicleCount: 0,
      sharePercent: null,
      policyVersion: "fintraffic-freight-proxy-v1",
    },
  },
};

function history(summaries: HistorySummary[]): HistoryResponse {
  return {
    query: {
      assetIds: summaries.map((item) => item.assetId),
      metric: "average-speed-kmh",
      direction: 1,
      resolution: "hour",
      from: "2026-09-03T00:00:00.000Z",
      to: "2026-09-05T00:00:00.000Z",
    },
    resolution: "hour",
    timeZone: "Europe/Helsinki",
    coverage: {
      status: "PARTIAL",
      requestedDays: 2,
      availableDays: 1,
      missingDates: ["2026-09-04"],
      missingDetails: [],
    },
    series: [],
    summaries,
  };
}

describe("createAnalysisPresentation", () => {
  it("uses the canonical summaries for comparison and coverage", () => {
    const comparison = {
      ...summary,
      assetId: "fintraffic-tms:20004",
      assetName: "Kasavuori",
      averageSpeedKmh: 79,
    };

    expect(createAnalysisPresentation(history([summary, comparison]))).toEqual({
      primary: summary,
      comparison,
      averageSpeedDifferenceKmh: 5,
      averageSpeedDifferencePercent: expect.closeTo(6.329, 3),
      vehicleCountDifference: 0,
      vehicleCountDifferencePercent: 0,
      coveragePercent: 50,
    });
  });

  it("does not invent a difference when a comparison is unavailable", () => {
    expect(
      createAnalysisPresentation(
        history([{ ...summary, averageSpeedKmh: null }]),
      ),
    ).toMatchObject({
      comparison: null,
      averageSpeedDifferenceKmh: null,
    });
  });
});
