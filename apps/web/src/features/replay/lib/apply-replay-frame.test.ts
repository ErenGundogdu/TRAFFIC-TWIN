import type { ReplayFrame, StationSummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { applyReplayFrame } from "./apply-replay-frame";

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
      label: "Yön 1",
      averageSpeedKmh: 90,
      flowVehiclesPerHour: 600,
      measuredAt: "2026-09-07T12:00:00.000Z",
    },
    {
      direction: 2,
      label: "Yön 2",
      averageSpeedKmh: 80,
      flowVehiclesPerHour: 480,
      measuredAt: "2026-09-07T12:00:00.000Z",
    },
  ],
};

describe("applyReplayFrame", () => {
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

    const [projected] = applyReplayFrame([station], frame, 2);

    expect(projected?.directions).toEqual([
      {
        direction: 1,
        label: "Yön 1",
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
      },
      {
        direction: 2,
        label: "Yön 2",
        averageSpeedKmh: 72,
        flowVehiclesPerHour: 840,
        measuredAt: frame.timestamp,
      },
    ]);
  });
});
