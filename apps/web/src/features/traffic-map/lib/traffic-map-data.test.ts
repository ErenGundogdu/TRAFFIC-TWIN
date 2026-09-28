import type {
  AnomalyEvaluation,
  JunctionSummary,
  StationSummary,
  TrafficEvent,
} from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  countAnomalousAssets,
  createAnomalyGeoJson,
  createJunctionGeoJson,
  createStationGeoJson,
  createTrafficEventGeoJson,
  getTrafficEventAnchor,
} from "./traffic-map-data";

const trafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 90,
  flowPercentOfCapacity: 45,
  freeFlowSpeedKmh: 100,
  maximumFlowVehiclesPerHour: 4_000,
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
      averageSpeedKmh: 93,
      flowVehiclesPerHour: 1_488,
      measuredAt: "2026-09-04T09:03:35Z",
      trafficFlow,
    },
    {
      direction: 2,
      heading: {
        degrees: 118,
        compassPoint: "SE",
        determination: "DERIVED_OPPOSITE",
      },
      averageSpeedKmh: 103,
      flowVehiclesPerHour: 612,
      measuredAt: "2026-09-04T09:03:35Z",
      trafficFlow,
    },
  ],
  lanes: [],
};

const junction: JunctionSummary = {
  id: "osm-junction:1",
  osmRelationId: "1",
  name: "Kavşak 1",
  longitude: 24.7,
  latitude: 60.2,
  roadRefs: ["1", "50"],
  coverage: "FULL",
  policyVersion: "osm-junction-v1",
  sourceUpdatedAt: "2026-09-04T09:03:35Z",
  sensors: [],
};

describe("asset map data", () => {
  it("carries the provider direction and flow state into station presentation data", () => {
    const result = createStationGeoJson([station], station.id);

    expect(result.features[0]?.properties).toMatchObject({
      bearing: 298,
      directionOneFlowStatus: "FREE_FLOW",
      directionTwoFlowStatus: "FREE_FLOW",
      selected: true,
    });
  });

  it("carries the strongest anomaly state into station and detail layers", () => {
    const anomalies = [
      { assetId: station.id, status: "CANDIDATE" },
      { assetId: station.id, status: "ACTIVE" },
    ] as AnomalyEvaluation[];

    const overview = createStationGeoJson([station], station.id, anomalies);
    const detail = createAnomalyGeoJson([station], anomalies, station.id);

    expect(overview.features[0]?.properties.anomalyStatus).toBe("ACTIVE");
    expect(detail.features[0]?.properties).toMatchObject({
      status: "ACTIVE",
      selected: true,
    });
    expect(countAnomalousAssets(anomalies)).toBe(1);
  });

  it("marks an unknown direction explicitly instead of inventing a bearing", () => {
    const result = createStationGeoJson(
      [
        {
          ...station,
          bearing: null,
          directions: station.directions.map((direction) => ({
            ...direction,
            heading: null,
          })) as StationSummary["directions"],
        },
      ],
      null,
    );

    expect(result.features[0]?.properties.bearing).toBe(-1);
  });

  it("exposes junction coverage without inventing approach geometry", () => {
    const result = createJunctionGeoJson([junction], null);

    expect(result.features[0]?.properties).toMatchObject({
      coverage: "FULL",
      sensorCount: 0,
      roadRefCount: 2,
    });
  });
});

const event: TrafficEvent = {
  id: "fintraffic-traffic-message:GUID1",
  providerEventId: "GUID1",
  category: "ROAD_WORK",
  status: "ACTIVE",
  severity: "HIGH",
  title: "Tie 1. Tietyö.",
  description: "Työ vaikuttaa liikenteeseen.",
  comment: null,
  effects: ["Nopeusrajoitus"],
  direction: "BOTH",
  directionDescription: null,
  sender: "Fintraffic Tieliikennekeskus Helsinki",
  language: "fi",
  geometry: {
    type: "LineString",
    coordinates: [
      [24.8, 60.2],
      [24.9, 60.2],
    ],
  },
  roadNumbers: [1],
  releaseTime: "2026-09-14T07:00:00.000Z",
  versionTime: "2026-09-14T07:30:00.000Z",
  startsAt: "2026-09-14T06:00:00.000Z",
  endsAt: null,
};

describe("createTrafficEventGeoJson", () => {
  it("keeps the real geometry of the already filtered event collection", () => {
    const result = createTrafficEventGeoJson([event]);

    expect(result.features[0]).toMatchObject({
      geometry: event.geometry,
      properties: {
        kind: "traffic-event",
        category: "ROAD_WORK",
        status: "ACTIVE",
      },
    });
  });

  it("does not render ended events on the live layer", () => {
    const result = createTrafficEventGeoJson([{ ...event, status: "ENDED" }]);

    expect(result.features).toEqual([]);
  });

  it("finds a stable map anchor from the event geometry bounds", () => {
    expect(getTrafficEventAnchor(event)).toEqual({
      longitude: 24.85,
      latitude: 60.2,
    });
  });
});

describe("corridor highlighting", () => {
  function at(id: string, longitude: number): StationSummary {
    return { ...station, id, tmsNumber: Number(id), longitude, latitude: 60.2 };
  }
  // Deliberately out of west-to-east order to prove the path follows geography,
  // not the order (or TMS numbers) the stations arrive in.
  const stations = [at("3", 24.9), at("1", 24.5), at("4", 25.1), at("2", 24.7)];

  it("dims every other station only while a corridor is highlighted", () => {
    const highlighted = new Set(["1", "2"]);
    const withCorridor = createStationGeoJson(stations, null, [], highlighted);
    expect(
      withCorridor.features.map((feature) => feature.properties.dimmed),
    ).toEqual([true, false, true, false]);

    const without = createStationGeoJson(stations, null);
    expect(
      without.features.every((feature) => !feature.properties.dimmed),
    ).toBe(true);
  });

  it("keeps a separately selected station undimmed", () => {
    const collection = createStationGeoJson(stations, "4", [], new Set(["1"]));
    expect(collection.features[2]?.properties.dimmed).toBe(false);
  });
});
