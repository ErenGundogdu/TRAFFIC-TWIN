import { describe, expect, it } from "vitest";

import { summarizeTrafficComposition } from "./traffic-composition-summary.js";

describe("summarizeTrafficComposition", () => {
  it("calculates class, lane, matrix and explainable freight proxy metrics", () => {
    const result = summarizeTrafficComposition(
      [
        {
          vehicleClassBreakdown: {
            "1": { vehicleCount: 6, speedTotalKmh: 480 },
            "2": { vehicleCount: 2, speedTotalKmh: 140 },
            "4": { vehicleCount: 2, speedTotalKmh: 120 },
          },
          laneBreakdown: {
            "1": { vehicleCount: 7, speedTotalKmh: 510 },
            "2": { vehicleCount: 3, speedTotalKmh: 230 },
          },
          laneVehicleClassBreakdown: {
            "1:1": { vehicleCount: 3, speedTotalKmh: 240 },
            "1:2": { vehicleCount: 2, speedTotalKmh: 140 },
            "1:4": { vehicleCount: 2, speedTotalKmh: 130 },
            "2:1": { vehicleCount: 3, speedTotalKmh: 240 },
          },
        },
      ],
      12,
    );

    expect(result).toMatchObject({
      classifiedVehicleCount: 10,
      classificationCoveragePercent: 83.3,
      freightProxy: {
        vehicleCount: 4,
        sharePercent: 40,
        policyVersion: "fintraffic-freight-proxy-v1",
      },
      vehicleClasses: [
        { key: 1, vehicleCount: 6, sharePercent: 60, averageSpeedKmh: 80 },
        { key: 2, vehicleCount: 2, sharePercent: 20, averageSpeedKmh: 70 },
        { key: 4, vehicleCount: 2, sharePercent: 20, averageSpeedKmh: 60 },
      ],
      lanes: [
        {
          key: 1,
          vehicleCount: 7,
          sharePercent: 70,
          averageSpeedKmh: 72.9,
        },
        {
          key: 2,
          vehicleCount: 3,
          sharePercent: 30,
          averageSpeedKmh: 76.7,
        },
      ],
    });
    expect(result.laneVehicleClasses).toContainEqual({
      lane: 1,
      vehicleClass: 4,
      vehicleCount: 2,
      sharePercent: 20,
      averageSpeedKmh: 65,
    });
  });

  it("shows zero composition coverage for legacy aggregate rows", () => {
    expect(
      summarizeTrafficComposition(
        [
          {
            vehicleClassBreakdown: {},
            laneBreakdown: {},
            laneVehicleClassBreakdown: {},
          },
        ],
        25,
      ),
    ).toMatchObject({
      classifiedVehicleCount: 0,
      classificationCoveragePercent: 0,
      vehicleClasses: [],
      lanes: [],
      laneVehicleClasses: [],
      freightProxy: { vehicleCount: 0, sharePercent: null },
    });
  });
});
