import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { normalizeTrafficEvents } from "./normalize-traffic-events.js";
import { readFixture } from "./test-fixtures.js";
import { trafficMessageFeatureCollectionSchema } from "./traffic-message-schemas.js";

const coverageArea: CoverageArea = {
  id: "test-area",
  name: "Test area",
  timeZone: "Europe/Helsinki",
  bbox: [23, 60, 26.1, 62],
};

describe("normalizeTrafficEvents", () => {
  it("normalizes provider lifecycle, severity and road identity", () => {
    const announcements = trafficMessageFeatureCollectionSchema.parse(
      readFixture("traffic-announcements.sample.json"),
    );
    const roadWorks = trafficMessageFeatureCollectionSchema.parse(
      readFixture("roadworks.sample.json"),
    );

    const result = normalizeTrafficEvents(
      [
        { category: "TRAFFIC_ANNOUNCEMENT", collection: announcements },
        { category: "ROAD_WORK", collection: roadWorks },
      ],
      coverageArea,
      new Date("2026-09-14T10:00:00Z"),
    );

    expect(result.sourceUpdatedAt).toBe("2026-09-14T07:36:51.015Z");
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerEventId: "GUID50470546",
          category: "TRAFFIC_ANNOUNCEMENT",
          status: "ACTIVE",
          severity: "UNKNOWN",
          effects: ["Liikennejärjestelyt ovat muuttuneet"],
          direction: "UNKNOWN",
          sender: "Tampereen kaupunki",
          language: "fi",
        }),
        expect.objectContaining({
          providerEventId: "GUID50470676",
          category: "ROAD_WORK",
          status: "UPCOMING",
          severity: "HIGH",
          effects: [
            "Nopeusrajoitus",
            "Liikenne ohjataan vuorotellen tapahtumapaikan ohi",
          ],
          direction: "BOTH",
          directionDescription: "Pernaja",
          sender: "Fintraffic Tieliikennekeskus Helsinki",
          comment: null,
          roadNumbers: [170],
        }),
      ]),
    );
  });

  it("excludes geometries outside the configured coverage area", () => {
    const roadWorks = trafficMessageFeatureCollectionSchema.parse(
      readFixture("roadworks.sample.json"),
    );

    const result = normalizeTrafficEvents(
      [{ category: "ROAD_WORK", collection: roadWorks }],
      { ...coverageArea, bbox: [24.5, 60.1, 25.25, 60.45] },
      new Date("2026-09-14T10:00:00Z"),
    );

    expect(result.events).toEqual([]);
  });
});
