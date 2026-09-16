import type { TrafficEvent } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  createTrafficEventGeoJson,
  getTrafficEventAnchor,
} from "./traffic-map-data";

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
