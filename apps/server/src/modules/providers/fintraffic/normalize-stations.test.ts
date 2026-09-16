import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { normalizeStations } from "./normalize-stations.js";
import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
  stationSensorConstantsCollectionSchema,
} from "./schemas.js";
import { readFixture } from "./test-fixtures.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki metropol bölgesi",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

describe("normalizeStations", () => {
  it("maps real sliding-window sensors into two explicit directions", () => {
    const stations = normalizeStations(
      stationFeatureCollectionSchema.parse(readFixture("stations.sample.json")),
      stationDataCollectionSchema.parse(
        readFixture("station-data.sample.json"),
      ),
      coverageArea,
      new Date("2026-09-04T09:04:00Z"),
      stationSensorConstantsCollectionSchema.parse({
        dataUpdatedTime: "2026-09-04T06:00:00Z",
        stations: [
          {
            id: 20002,
            sensorConstantValues: [
              {
                name: "VVAPAAS1",
                value: 100,
                validFrom: "01-01",
                validTo: "12-31",
              },
              {
                name: "VVAPAAS2",
                value: 105,
                validFrom: "01-01",
                validTo: "12-31",
              },
              {
                name: "MS1",
                value: 3600,
                validFrom: "01-01",
                validTo: "12-31",
              },
              {
                name: "MS2",
                value: 3200,
                validFrom: "01-01",
                validTo: "12-31",
              },
            ],
          },
        ],
      }),
    );

    expect(stations).toEqual([
      expect.objectContaining({
        id: "fintraffic-tms:20002",
        freshness: "FRESH",
        longitude: 24.637997,
        latitude: 60.220898,
        directions: [
          expect.objectContaining({
            direction: 1,
            heading: {
              degrees: 298,
              compassPoint: "NW",
              determination: "PROVIDER_REPORTED",
            },
            averageSpeedKmh: 93,
            flowVehiclesPerHour: 1488,
            trafficFlow: expect.objectContaining({
              status: "FREE_FLOW",
              speedPercentOfFreeFlow: 93,
              flowPercentOfCapacity: 41.3,
            }),
          }),
          expect.objectContaining({
            direction: 2,
            heading: {
              degrees: 118,
              compassPoint: "SE",
              determination: "DERIVED_OPPOSITE",
            },
            averageSpeedKmh: 103,
            flowVehiclesPerHour: 612,
            trafficFlow: expect.objectContaining({
              status: "FREE_FLOW",
              speedPercentOfFreeFlow: 98.1,
              flowPercentOfCapacity: 19.1,
            }),
          }),
        ],
      }),
    ]);
  });

  it("uses Fintraffic's reported direction ratios without a regional speed threshold", () => {
    const stations = normalizeStations(
      stationFeatureCollectionSchema.parse(readFixture("stations.sample.json")),
      stationDataCollectionSchema.parse(
        readFixture("station-flow-ratios.sample.json"),
      ),
      coverageArea,
      new Date("2026-09-08T07:26:00Z"),
    );

    expect(stations[0]?.directions).toEqual([
      expect.objectContaining({
        direction: 1,
        trafficFlow: expect.objectContaining({
          status: "PLATOONING",
          speedPercentOfFreeFlow: 87,
          flowPercentOfCapacity: 27,
        }),
      }),
      expect.objectContaining({
        direction: 2,
        trafficFlow: expect.objectContaining({
          status: "FREE_FLOW",
          speedPercentOfFreeFlow: 94,
          flowPercentOfCapacity: 14,
        }),
      }),
    ]);
  });
});
