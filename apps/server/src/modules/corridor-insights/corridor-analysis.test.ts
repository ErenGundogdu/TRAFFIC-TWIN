import type { StationSummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { analyzeCorridorDirection } from "./corridor-analysis.js";

const now = new Date("2026-09-22T18:00:00.000Z");

describe("corridor analysis", () => {
  it("marks a selected-only speed loss as local", () => {
    const selected = station("selected", 60, 0, 0);
    const result = analyzeCorridorDirection(
      selected,
      1,
      [
        selected,
        station("peer-a", 95, 0.01, 0.01),
        station("peer-b", 90, 0.02, 0.02),
      ],
      now,
    );

    expect(result.status).toBe("LOCAL_SLOWDOWN");
    expect(result.peerMedianSpeedPercentOfFreeFlow).toBe(92.5);
    expect(result.selectedDifferencePercentagePoints).toBe(-32.5);
  });

  it("requires several slow stations before calling the slowdown widespread", () => {
    const selected = station("selected", 65, 0, 0);
    const result = analyzeCorridorDirection(
      selected,
      1,
      [
        selected,
        station("peer-a", 70, 0.01, 0.01),
        station("peer-b", 75, 0.02, 0.02),
        station("peer-c", 96, 0.03, 0.03),
      ],
      now,
    );

    expect(result.status).toBe("WIDESPREAD_SLOWDOWN");
  });

  it("aligns physical headings even when provider direction numbers differ", () => {
    const selected = station("selected", 95, 0, 0);
    const peerA = station("peer-a", 95, 0.01, 0.01, 180);
    const peerB = station("peer-b", 95, 0.02, 0.02, 180);
    const result = analyzeCorridorDirection(
      selected,
      1,
      [selected, peerA, peerB],
      now,
    );

    expect(result.status).toBe("BALANCED");
    expect(result.peers.map((peer) => peer.direction)).toEqual([2, 2]);
  });

  it("does not infer a corridor state from one comparable neighbor", () => {
    const selected = station("selected", 60, 0, 0);
    const result = analyzeCorridorDirection(
      selected,
      1,
      [selected, station("peer-a", 95, 0.01, 0.01)],
      now,
    );

    expect(result.status).toBe("INSUFFICIENT_DATA");
  });
});

function station(
  id: string,
  speedPercent: number,
  longitude: number,
  latitude: number,
  directionOneHeading = 0,
): StationSummary {
  return {
    id,
    providerStationId: Math.abs(hash(id)) + 1,
    tmsNumber: Math.abs(hash(id)) + 1,
    name: id,
    longitude: 24 + longitude,
    latitude: 60 + latitude,
    bearing: directionOneHeading,
    freshness: "FRESH",
    directions: [
      direction(1, directionOneHeading, speedPercent),
      direction(2, (directionOneHeading + 180) % 360, speedPercent),
    ],
    lanes: [],
  };
}

function direction(
  value: 1 | 2,
  heading: number,
  speedPercent: number,
): StationSummary["directions"][number] {
  return {
    direction: value,
    heading: {
      degrees: heading,
      compassPoint: heading === 0 ? "N" : "S",
      determination: value === 1 ? "PROVIDER_REPORTED" : "DERIVED_OPPOSITE",
    },
    averageSpeedKmh: speedPercent,
    flowVehiclesPerHour: 600,
    measuredAt: "2026-09-22T17:59:00.000Z",
    trafficFlow: {
      status: speedPercent <= 80 ? "SLOW" : "FREE_FLOW",
      speedPercentOfFreeFlow: speedPercent,
      flowPercentOfCapacity: 40,
      freeFlowSpeedKmh: 100,
      maximumFlowVehiclesPerHour: 1_500,
      policyVersion: "fintraffic-flow-v1",
    },
  };
}

function hash(value: string) {
  return [...value].reduce(
    (total, character) => total * 31 + character.charCodeAt(0),
    0,
  );
}
