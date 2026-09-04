import { describe, expect, it } from "vitest";

import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
} from "./schemas.js";
import { readFixture } from "./test-fixtures.js";

describe("Fintraffic response schemas", () => {
  it("parses the recorded station metadata fixture", () => {
    const payload = stationFeatureCollectionSchema.parse(
      readFixture("stations.sample.json"),
    );

    expect(payload.features[0]?.properties.name).toBe("vt1_Espoo_Hirvisuo");
  });

  it("parses the recorded current measurement fixture", () => {
    const payload = stationDataCollectionSchema.parse(
      readFixture("station-data.sample.json"),
    );

    expect(payload.stations[0]?.sensorValues).toHaveLength(4);
  });
});
