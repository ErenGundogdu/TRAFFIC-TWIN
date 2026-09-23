import type { TrafficLane } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { compareStationLanes, findLaneImbalances } from "./lane-imbalance";

const now = new Date("2026-09-22T12:00:00Z");

function lane(
  number: number,
  speed: number | null,
  overrides: Partial<TrafficLane> = {},
): TrafficLane {
  return {
    lane: number,
    direction: 1,
    directionEvidence: "OBSERVED_PASSAGES",
    averageSpeedKmh: speed,
    flowVehiclesPerHour: 120,
    flowWindow: "ROLLING_5_MINUTES",
    measuredAt: "2026-09-22T11:59:00Z",
    ...overrides,
  };
}

describe("findLaneImbalances", () => {
  it("reports a measured difference against same-direction peers", () => {
    const result = findLaneImbalances(
      {
        lanes: [lane(1, 48), lane(2, 80), lane(3, 100)],
      },
      now,
    );

    expect(result).toEqual([
      expect.objectContaining({
        direction: 1,
        lane: 1,
        speedKmh: 48,
        referenceSpeedKmh: 90,
        slowerPercent: 47,
        flowVehiclesPerHour: 120,
        referenceFlowVehiclesPerHour: 120,
        isNotable: true,
        peerLanes: [2, 3],
      }),
    ]);
  });

  it("explains normal same-direction speeds with both measured flow rates", () => {
    expect(
      compareStationLanes(
        {
          lanes: [
            lane(1, 89, { flowVehiclesPerHour: 804 }),
            lane(2, 103, { flowVehiclesPerHour: 1_248 }),
          ],
        },
        now,
      ),
    ).toEqual([
      expect.objectContaining({
        lane: 1,
        slowerPercent: 14,
        flowVehiclesPerHour: 804,
        referenceFlowVehiclesPerHour: 1_248,
        isNotable: false,
      }),
    ]);
  });

  it("reports every lane that is notably slower than its own peers, not only the single worst one", () => {
    // Two lanes (40, 42) are both well below the other two (100, 105); each
    // must be judged against the OTHER lanes' median, not against a
    // reference that already includes the other slow lane.
    const result = findLaneImbalances(
      {
        lanes: [lane(1, 40), lane(2, 42), lane(3, 100), lane(4, 105)],
      },
      now,
    );

    expect(result).toEqual([
      expect.objectContaining({
        lane: 1,
        referenceSpeedKmh: 100,
        slowerPercent: 60,
        isNotable: true,
        peerLanes: [2, 3, 4],
      }),
      expect.objectContaining({
        lane: 2,
        referenceSpeedKmh: 100,
        slowerPercent: 58,
        isNotable: true,
        peerLanes: [1, 3, 4],
      }),
    ]);
  });

  it("does not mix directions or infer a direction for an unresolved lane", () => {
    const result = findLaneImbalances(
      {
        lanes: [
          lane(1, 40),
          lane(2, 100, { direction: 2 }),
          lane(3, 110, { direction: null }),
        ],
      },
      now,
    );

    expect(result).toEqual([]);
  });

  it("rejects stale, misaligned, sparse and missing measurements", () => {
    const peer = lane(2, 100);
    const unreliable: TrafficLane[] = [
      lane(1, 40, { measuredAt: "2026-09-22T11:54:00Z" }),
      lane(1, 40, { measuredAt: "2026-09-22T11:56:00Z" }),
      lane(1, 40, { flowVehiclesPerHour: 24 }),
      lane(1, null),
      lane(1, 40, { measuredAt: null }),
    ];

    for (const candidate of unreliable) {
      expect(findLaneImbalances({ lanes: [candidate, peer] }, now)).toEqual([]);
    }
  });

  it("does not flag small differences or generally slow lanes", () => {
    expect(
      findLaneImbalances({ lanes: [lane(1, 65), lane(2, 85)] }, now),
    ).toEqual([]);
    expect(
      findLaneImbalances({ lanes: [lane(1, 15), lane(2, 25)] }, now),
    ).toEqual([]);
  });
});
