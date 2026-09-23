import type {
  StationRoadContext,
  StationSummary,
} from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  createRoadFlowGeoJson,
  createTrafficDensityGeoJson,
  createTrafficVolumeGeoJson,
} from "./traffic-flow-data";

const trafficFlow = {
  status: "PLATOONING" as const,
  speedPercentOfFreeFlow: 80,
  flowPercentOfCapacity: 50,
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
      averageSpeedKmh: 80,
      flowVehiclesPerHour: 900,
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
      averageSpeedKmh: 70,
      flowVehiclesPerHour: 600,
      measuredAt: "2026-09-07T12:00:00.000Z",
      trafficFlow,
    },
  ],
  lanes: [],
};

const roadContext: StationRoadContext = {
  assetId: station.id,
  status: "MATCHED",
  freshness: "FRESH",
  roadRef: "1",
  matchingPolicy: "osm-ref-nearest-bearing-v1",
  source: {
    id: "openstreetmap",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    updatedAt: "2026-09-07T12:31:06.000Z",
    fetchedAt: "2026-09-07T13:00:00.000Z",
  },
  segments: [
    {
      id: "openstreetmap:way:4218023",
      osmWayId: "4218023",
      name: "Turunväylä",
      roadRef: "1",
      highwayClass: "motorway",
      direction: 1,
      distanceMeters: 16,
      coordinates: [
        [24.6373727, 60.2209753],
        [24.6382883, 60.2208906],
      ],
    },
  ],
};

describe("traffic flow map data", () => {
  it("keeps the real vehicle rate in heatmap and 3D features", () => {
    const density = createTrafficDensityGeoJson([station]);
    const volume = createTrafficVolumeGeoJson([station]);

    expect(density.features[0]?.properties.totalFlowVehiclesPerHour).toBe(
      1_500,
    );
    expect(volume.features[0]?.properties).toMatchObject({
      totalFlowVehiclesPerHour: 1_500,
      relativeFlowPercent: 100,
      heightMeters: 450,
    });
  });

  it("maps selected direction measurements onto real OSM geometry", () => {
    const roads = createRoadFlowGeoJson(roadContext, station);

    expect(roads.features[0]).toMatchObject({
      geometry: { coordinates: roadContext.segments[0]?.coordinates },
      properties: {
        direction: 1,
        directionLabel: "Yön 1 · KB",
        speedKmh: 80,
        flowVehiclesPerHour: 900,
        hasMeasurement: true,
        trafficFlowStatus: "PLATOONING",
        speedPercentOfFreeFlow: 80,
        flowPercentOfCapacity: 50,
      },
    });
  });

  it("keeps numeric map expressions free of null when measurements are absent", () => {
    const stationWithoutMeasurements: StationSummary = {
      ...station,
      directions: station.directions.map((direction) => ({
        ...direction,
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        trafficFlow: {
          ...direction.trafficFlow,
          status: "INSUFFICIENT_DATA",
          speedPercentOfFreeFlow: null,
          flowPercentOfCapacity: null,
        },
      })),
    };

    const density = createTrafficDensityGeoJson([stationWithoutMeasurements]);
    const volume = createTrafficVolumeGeoJson([stationWithoutMeasurements]);
    const roads = createRoadFlowGeoJson(
      roadContext,
      stationWithoutMeasurements,
    );

    expect(density.features[0]?.properties).toMatchObject({
      totalFlowVehiclesPerHour: 0,
      hasFlow: false,
    });
    expect(volume.features).toEqual([]);
    expect(roads.features[0]?.properties).toMatchObject({
      speedKmh: -1,
      flowVehiclesPerHour: 0,
      hasMeasurement: false,
      speedPercentOfFreeFlow: -1,
      flowPercentOfCapacity: -1,
    });
  });
});
