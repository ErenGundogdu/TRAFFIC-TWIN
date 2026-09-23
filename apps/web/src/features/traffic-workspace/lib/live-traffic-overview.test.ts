import type {
  StationSummary,
  TrafficFlowStatus,
} from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { createLiveTrafficOverview } from "./live-traffic-overview";

function station(
  id: string,
  statuses: [TrafficFlowStatus, TrafficFlowStatus],
  freshness: StationSummary["freshness"] = "FRESH",
): StationSummary {
  return {
    id,
    providerStationId: Number(id),
    tmsNumber: Number(id),
    name: `TMS ${id}`,
    longitude: 24.9,
    latitude: 60.2,
    bearing: null,
    freshness,
    directions: statuses.map((status, index) => ({
      direction: (index + 1) as 1 | 2,
      heading: null,
      averageSpeedKmh: null,
      flowVehiclesPerHour: null,
      measuredAt: null,
      trafficFlow: {
        status,
        speedPercentOfFreeFlow: null,
        flowPercentOfCapacity: null,
        freeFlowSpeedKmh: null,
        maximumFlowVehiclesPerHour: null,
        policyVersion: "fintraffic-flow-v1" as const,
      },
    })) as StationSummary["directions"],
    lanes: [],
  };
}

describe("createLiveTrafficOverview", () => {
  it("classifies each station once using the most restrictive real flow state", () => {
    const result = createLiveTrafficOverview([
      station("1", ["FREE_FLOW", "PLATOONING"]),
      station("2", ["FREE_FLOW", "SLOW"]),
      station("3", ["SLOW", "QUEUING"], "STALE"),
      station("4", ["INSUFFICIENT_DATA", "INSUFFICIENT_DATA"]),
    ]);

    expect(result).toEqual({
      totalStations: 4,
      freshStations: 3,
      flowingStations: 1,
      slowStations: 1,
      congestedStations: 1,
      insufficientStations: 1,
    });
  });
});
