import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { normalizeStations } from "./normalize-stations.js";
import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
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
            averageSpeedKmh: 93,
            flowVehiclesPerHour: 1488,
          }),
          expect.objectContaining({
            direction: 2,
            averageSpeedKmh: 103,
            flowVehiclesPerHour: 612,
          }),
        ],
      }),
    ]);
  });
});
