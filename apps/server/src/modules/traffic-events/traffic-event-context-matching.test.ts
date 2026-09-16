import type { TrafficEvent } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { matchTrafficEventContext } from "./traffic-event-context-matching.js";

const event: TrafficEvent = {
  id: "event-1",
  providerEventId: "1",
  category: "ROAD_WORK",
  status: "ACTIVE",
  severity: "HIGH",
  title: "Tie 1. Tietyö.",
  description: null,
  comment: null,
  effects: [],
  direction: "UNKNOWN",
  directionDescription: null,
  sender: null,
  language: "fi",
  geometry: { type: "Point", coordinates: [24.8, 60.2] },
  roadNumbers: [1],
  releaseTime: "2026-09-15T07:00:00.000Z",
  versionTime: "2026-09-15T07:30:00.000Z",
  startsAt: "2026-09-15T06:00:00.000Z",
  endsAt: null,
};

describe("matchTrafficEventContext", () => {
  it("keeps same-road events in the corridor and nearby events locally", () => {
    const matches = matchTrafficEventContext(
      [
        { event, distanceMeters: 4_500 },
        {
          event: { ...event, id: "nearby", roadNumbers: [50] },
          distanceMeters: 700,
        },
        {
          event: { ...event, id: "too-far", roadNumbers: [50] },
          distanceMeters: 1_001,
        },
      ],
      "1",
    );

    expect(matches).toEqual([
      expect.objectContaining({
        relation: "SAME_ROAD_NEARBY",
        matchedRoadNumber: 1,
        distanceMeters: 4_500,
      }),
      expect.objectContaining({
        event: expect.objectContaining({ id: "nearby" }),
        relation: "NEARBY",
        matchedRoadNumber: null,
        distanceMeters: 700,
      }),
    ]);
  });

  it("does not infer a road match when the station road is unavailable", () => {
    expect(
      matchTrafficEventContext([{ event, distanceMeters: 1_100 }], null),
    ).toEqual([]);
  });
});
