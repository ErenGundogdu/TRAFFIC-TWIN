import type { TrafficLane } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { evaluateLaneHistory } from "./lane-history-engine.js";
import type { HourlyLaneHistoryRow } from "./lane-history-repository.js";

const lane: TrafficLane = {
  lane: 1,
  direction: 1,
  directionEvidence: "OBSERVED_PASSAGES",
  averageSpeedKmh: 45,
  flowVehiclesPerHour: 300,
  flowWindow: "ROLLING_5_MINUTES",
  measuredAt: "2026-09-22T10:00:00.000Z",
};

function row(
  speed: number,
  flow: number,
  direction: 1 | 2 = 1,
): HourlyLaneHistoryRow {
  return {
    direction,
    timestamp: "2026-09-15T10:00:00.000Z",
    laneBreakdown: {
      "1": { vehicleCount: flow, speedTotalKmh: speed * flow },
    },
  };
}

describe("evaluateLaneHistory", () => {
  it("does not invent a baseline before six comparable hours exist", () => {
    const [result] = evaluateLaneHistory([lane], [row(70, 200)]);

    expect(result?.speed).toMatchObject({
      state: "INSUFFICIENT_DATA",
      sampleCount: 1,
      expectedMedian: null,
    });
  });

  it("classifies speed and flow independently against robust ranges", () => {
    const history = [
      row(70, 200),
      row(71, 205),
      row(69, 195),
      row(70, 200),
      row(72, 210),
      row(68, 190),
      row(400, 2_000, 2),
    ];
    const [result] = evaluateLaneHistory([lane], history);

    expect(result?.speed.state).toBe("LOW");
    expect(result?.speed.expectedMedian).toBe(70);
    expect(result?.flow.state).toBe("HIGH");
    expect(result?.flow.sampleCount).toBe(6);
  });

  it("ignores an absent lane instead of treating it as zero", () => {
    const rows = Array.from({ length: 6 }, () => ({
      direction: 1 as const,
      timestamp: "2026-09-15T10:00:00.000Z",
      laneBreakdown: {},
    }));
    const [result] = evaluateLaneHistory([lane], rows);

    expect(result?.speed.sampleCount).toBe(0);
    expect(result?.flow.state).toBe("INSUFFICIENT_DATA");
  });
});
