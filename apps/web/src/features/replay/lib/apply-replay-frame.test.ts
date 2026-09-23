import type { ReplayFrame, StationSummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { applyReplayFrame } from "./apply-replay-frame";

const trafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 95,
  flowPercentOfCapacity: 40,
  freeFlowSpeedKmh: 100,
  maximumFlowVehiclesPerHour: 1_800,
  policyVersion: "fintraffic-flow-v1" as const,
};

const station: StationSummary = {
  id: "fintraffic-tms:20002",
  providerStationId: 20002,
  tmsNumber: 20002,
  name: "vt1_Espoo_Hirvisuo",
  longitude: 24.637997,
  latitude: 60.220898,
  bearing: 298,
  freshness: "FRESH",
  directions: [
    {
      direction: 1,
      heading: {
        degrees: 298,
        compassPoint: "NW",
        determination: "PROVIDER_REPORTED",
      },
      averageSpeedKmh: 90,
      flowVehiclesPerHour: 600,
      measuredAt: "2026-09-07T12:00:00.000Z",
      trafficFlow,
    },
    {
      direction: 2,
      heading: {
        degrees: 118,
        compassPoint: "SE",
        determination: "DERIVED_OPPOSITE",
      },
      averageSpeedKmh: 80,
      flowVehiclesPerHour: 480,
      measuredAt: "2026-09-07T12:00:00.000Z",
      trafficFlow,
    },
  ],
  lanes: [],
};

describe("applyReplayFrame", () => {
  it("removes live measurements before the first historical frame", () => {
    const [projected] = applyReplayFrame([station], null, 1, "minute");

    expect(projected?.directions).toEqual(
      station.directions.map((direction) => ({
        ...direction,
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
        trafficFlow: {
          ...direction.trafficFlow,
          status: "INSUFFICIENT_DATA",
          speedPercentOfFreeFlow: null,
          flowPercentOfCapacity: null,
        },
      })),
    );
  });

  it("projects only the selected historical direction onto map stations", () => {
    const frame: ReplayFrame = {
      timestamp: "2026-09-03T08:25:00.000Z",
      values: [
        {
          assetId: station.id,
          averageSpeedKmh: 72,
          vehicleCount: 14,
          sampleCount: 14,
        },
      ],
    };

    const [projected] = applyReplayFrame([station], frame, 2, "minute");

    expect(projected?.directions).toEqual([
      {
        direction: 1,
        heading: station.directions[0]?.heading,
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
        trafficFlow: {
          ...trafficFlow,
          status: "INSUFFICIENT_DATA",
          speedPercentOfFreeFlow: null,
          flowPercentOfCapacity: null,
        },
      },
      {
        direction: 2,
        heading: station.directions[1]?.heading,
        averageSpeedKmh: 72,
        flowVehiclesPerHour: 840,
        measuredAt: frame.timestamp,
        trafficFlow: {
          ...trafficFlow,
          status: "INSUFFICIENT_DATA",
          speedPercentOfFreeFlow: null,
          flowPercentOfCapacity: null,
        },
      },
    ]);
  });

  it("treats an hour frame's vehicle count as already hourly, without scaling it up", () => {
    const frame: ReplayFrame = {
      timestamp: "2026-09-03T08:00:00.000Z",
      values: [
        {
          assetId: station.id,
          averageSpeedKmh: 72,
          vehicleCount: 840,
          sampleCount: 820,
        },
      ],
    };

    const [projected] = applyReplayFrame([station], frame, 1, "hour");

    expect(projected?.directions[0]?.flowVehiclesPerHour).toBe(840);
  });
});
