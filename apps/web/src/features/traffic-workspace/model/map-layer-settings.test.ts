import type { StationSummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  classifyStationTraffic,
  defaultMapLayerSettings,
  filterStationsForMap,
} from "./map-layer-settings";

function station(
  id: string,
  freshness: StationSummary["freshness"],
  statuses: [
    StationSummary["directions"][number]["trafficFlow"]["status"],
    StationSummary["directions"][number]["trafficFlow"]["status"],
  ],
): StationSummary {
  return {
    id,
    providerStationId: 1,
    tmsNumber: 1,
    name: id,
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
        policyVersion: "fintraffic-flow-v1",
      },
    })) as StationSummary["directions"],
    lanes: [],
  };
}

describe("map layer station filters", () => {
  it("opens with only the station layer visible", () => {
    expect(defaultMapLayerSettings).toMatchObject({
      stations: true,
      junctions: false,
      anomalies: false,
      roadWorks: false,
      trafficAnnouncements: false,
      fieldReports: false,
    });
  });

  it("uses the most operationally significant direction", () => {
    expect(
      classifyStationTraffic(station("one", "FRESH", ["FREE_FLOW", "SLOW"])),
    ).toBe("SLOW");
    expect(
      classifyStationTraffic(station("two", "FRESH", ["SLOW", "STATIONARY"])),
    ).toBe("CONGESTED");
  });

  it("filters dynamically while preserving the selected station", () => {
    const stations = [
      station("fresh", "FRESH", ["FREE_FLOW", "FREE_FLOW"]),
      station("stale", "STALE", ["SLOW", "SLOW"]),
    ];
    const settings = {
      ...defaultMapLayerSettings,
      freshness: ["FRESH" as const],
      trafficStates: ["FLOWING" as const],
    };

    expect(filterStationsForMap(stations, settings, "stale")).toEqual(stations);
    expect(filterStationsForMap(stations, settings, null)).toEqual([
      stations[0],
    ]);
  });

  it("hides all stations when the station layer is disabled", () => {
    const stations = [station("selected", "FRESH", ["FREE_FLOW", "FREE_FLOW"])];
    expect(
      filterStationsForMap(
        stations,
        { ...defaultMapLayerSettings, stations: false },
        "selected",
      ),
    ).toEqual([]);
  });
});
