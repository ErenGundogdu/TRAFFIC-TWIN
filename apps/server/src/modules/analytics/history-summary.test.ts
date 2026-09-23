import { describe, expect, it } from "vitest";

import { summarizeHistory } from "./history-summary.js";

const emptyComposition = {
  vehicleClassBreakdown: {},
  laneBreakdown: {},
  laneVehicleClassBreakdown: {},
};

describe("summarizeHistory", () => {
  it("calculates explainable speed, volume, peak and direction KPIs", () => {
    const result = summarizeHistory({
      assetIds: ["station-a"],
      assetNames: new Map([["station-a", "Station A"]]),
      direction: 1,
      rows: [
        {
          assetId: "station-a",
          direction: 1,
          bucketStart: new Date("2026-09-03T06:00:00Z"),
          averageSpeedKmh: 80,
          vehicleCount: 20,
          sampleCount: 20,
          ...emptyComposition,
        },
        {
          assetId: "station-a",
          direction: 1,
          bucketStart: new Date("2026-09-03T07:00:00Z"),
          averageSpeedKmh: 60,
          vehicleCount: 40,
          sampleCount: 40,
          ...emptyComposition,
        },
        {
          assetId: "station-a",
          direction: 2,
          bucketStart: new Date("2026-09-03T07:00:00Z"),
          averageSpeedKmh: 70,
          vehicleCount: 60,
          sampleCount: 60,
          ...emptyComposition,
        },
      ],
    });

    expect(result[0]).toMatchObject({
      assetName: "Station A",
      bucketCount: 2,
      sampleCount: 60,
      averageSpeedKmh: 66.7,
      medianSpeedKmh: 70,
      minimumSpeedKmh: 60,
      minimumSpeedAt: "2026-09-03T07:00:00.000Z",
      maximumSpeedKmh: 80,
      totalVehicleCount: 60,
      averageVehicleCountPerBucket: 30,
      peakVehicleCount: 40,
      peakVehicleAt: "2026-09-03T07:00:00.000Z",
      speedAtPeakVehicleCountKmh: 60,
      directionDistribution: {
        directionOneVehicleCount: 60,
        directionTwoVehicleCount: 60,
        directionOnePercent: 50,
        directionTwoPercent: 50,
      },
    });
  });

  it("returns explicit empty values when an asset has no rows", () => {
    const [summary] = summarizeHistory({
      assetIds: ["station-b"],
      assetNames: new Map([["station-b", "Station B"]]),
      direction: 2,
      rows: [],
    });

    expect(summary).toMatchObject({
      assetId: "station-b",
      bucketCount: 0,
      sampleCount: 0,
      averageSpeedKmh: null,
      medianSpeedKmh: null,
      minimumSpeedAt: null,
      totalVehicleCount: 0,
      peakVehicleCount: null,
      directionDistribution: {
        directionOnePercent: null,
        directionTwoPercent: null,
      },
    });
  });

  it("keeps measured volume when a bucket has no speed report", () => {
    const [summary] = summarizeHistory({
      assetIds: ["station-a"],
      assetNames: new Map(),
      direction: 1,
      rows: [
        {
          assetId: "station-a",
          direction: 1,
          bucketStart: new Date("2026-09-03T06:00:00Z"),
          averageSpeedKmh: 80,
          vehicleCount: 20,
          sampleCount: 20,
          ...emptyComposition,
        },
        {
          assetId: "station-a",
          direction: 1,
          bucketStart: new Date("2026-09-03T07:00:00Z"),
          averageSpeedKmh: null,
          vehicleCount: 40,
          sampleCount: 0,
          ...emptyComposition,
        },
      ],
    });

    expect(summary).toMatchObject({
      bucketCount: 2,
      totalVehicleCount: 60,
      averageVehicleCountPerBucket: 30,
      peakVehicleCount: 40,
      speedAtPeakVehicleCountKmh: null,
      sampleCount: 20,
      averageSpeedKmh: 80,
      medianSpeedKmh: 80,
      minimumSpeedKmh: 80,
      maximumSpeedKmh: 80,
    });
  });
});
