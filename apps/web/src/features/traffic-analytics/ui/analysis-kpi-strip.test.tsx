import type { HistoryResponse } from "@traffic-twin/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalysisKpiStrip } from "./analysis-kpi-strip";

describe("AnalysisKpiStrip", () => {
  it("shows canonical summary values and a comparison difference", () => {
    render(<AnalysisKpiStrip history={fixture} />);

    expect(screen.getByText("84 km/sa")).toBeInTheDocument();
    expect(
      screen.getByText("+5 km/sa karşılaştırmaya göre"),
    ).toBeInTheDocument();
    expect(screen.getByText("1.200 araç")).toBeInTheDocument();
    expect(screen.getByText("%100")).toBeInTheDocument();
  });
});

const emptyComposition = {
  classifiedVehicleCount: 0,
  classificationCoveragePercent: null,
  vehicleClasses: [],
  lanes: [],
  laneVehicleClasses: [],
  freightProxy: {
    vehicleCount: 0,
    sharePercent: null,
    policyVersion: "fintraffic-freight-proxy-v1" as const,
  },
};

const fixture: HistoryResponse = {
  query: {
    assetIds: ["a", "b"],
    metric: "average-speed-kmh",
    direction: 1,
    resolution: "hour",
    from: "2026-09-03T00:00:00.000Z",
    to: "2026-09-04T00:00:00.000Z",
  },
  resolution: "hour",
  timeZone: "Europe/Helsinki",
  coverage: {
    status: "COMPLETE",
    requestedDays: 1,
    availableDays: 1,
    missingDates: [],
    missingDetails: [],
  },
  series: [],
  summaries: [
    {
      assetId: "a",
      assetName: "A",
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
      composition: emptyComposition,
    },
    {
      assetId: "b",
      assetName: "B",
      direction: 1,
      bucketCount: 24,
      sampleCount: 72,
      averageSpeedKmh: 79,
      medianSpeedKmh: 80,
      minimumSpeedKmh: 58,
      minimumSpeedAt: "2026-09-03T05:00:00.000Z",
      maximumSpeedKmh: 93,
      maximumSpeedAt: "2026-09-03T01:00:00.000Z",
      totalVehicleCount: 1000,
      averageVehicleCountPerBucket: 41.7,
      peakVehicleCount: 80,
      peakVehicleAt: "2026-09-03T14:00:00.000Z",
      speedAtPeakVehicleCountKmh: 64,
      directionDistribution: {
        directionOneVehicleCount: 1000,
        directionTwoVehicleCount: 900,
        directionOnePercent: 52.6,
        directionTwoPercent: 47.4,
      },
      composition: emptyComposition,
    },
  ],
};
