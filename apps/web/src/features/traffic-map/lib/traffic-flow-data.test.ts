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
      averageSpeedKmh: 80,
      flowVehiclesPerHour: 900,
      measuredAt: "2026-09-07T12:00:00.000Z",
    },
    {
      direction: 2,
      label: "Yön 2",
      averageSpeedKmh: 70,
      flowVehiclesPerHour: 600,
      measuredAt: "2026-09-07T12:00:00.000Z",
    },
  ],
};

const roadContext: StationRoadContext = {
  assetId: station.id,
  status: "MATCHED",
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
        speedKmh: 80,
        flowVehiclesPerHour: 900,
        hasMeasurement: true,
      },
    });
  });
});
