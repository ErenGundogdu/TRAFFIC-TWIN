import { describe, expect, it } from "vitest";

import { classifyTrafficFlow } from "./classify-traffic-flow.js";

describe("classifyTrafficFlow", () => {
  it.each([
    [9.9, "STATIONARY"],
    [10, "QUEUING"],
    [25, "SLOW"],
    [75, "PLATOONING"],
    [90, "FREE_FLOW"],
    [108, "FREE_FLOW"],
  ] as const)("classifies %s%% as %s", (percentage, status) => {
    expect(
      classifyTrafficFlow({
        averageSpeedKmh: 80,
        flowVehiclesPerHour: 900,
        freeFlowSpeedKmh: 100,
        maximumFlowVehiclesPerHour: 1_800,
        reportedSpeedPercent: percentage,
      }).status,
    ).toBe(status);
  });

  it("derives explainable percentages from station references", () => {
    expect(
      classifyTrafficFlow({
        averageSpeedKmh: 82,
        flowVehiclesPerHour: 900,
        freeFlowSpeedKmh: 100,
        maximumFlowVehiclesPerHour: 1_800,
      }),
    ).toEqual({
      status: "PLATOONING",
      speedPercentOfFreeFlow: 82,
      flowPercentOfCapacity: 50,
      freeFlowSpeedKmh: 100,
      maximumFlowVehiclesPerHour: 1_800,
      policyVersion: "fintraffic-flow-v1",
    });
  });

  it("does not invent a state without a speed ratio or reference", () => {
    expect(
      classifyTrafficFlow({
        averageSpeedKmh: 82,
        flowVehiclesPerHour: 900,
        freeFlowSpeedKmh: null,
        maximumFlowVehiclesPerHour: null,
      }).status,
    ).toBe("INSUFFICIENT_DATA");
  });
});
