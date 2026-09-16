import type { TrafficEvent } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { defaultTrafficEventFilters } from "../model/traffic-event-filters";
import { filterTrafficEvents } from "./filter-traffic-events";

const event: TrafficEvent = {
  id: "road-work-1",
  providerEventId: "1",
  category: "ROAD_WORK",
  status: "ACTIVE",
  severity: "HIGH",
  title: "Tie 1, Espoo. Tietyö.",
  description: "Turunväylä",
  comment: null,
  effects: ["Nopeusrajoitus"],
  direction: "BOTH",
  directionDescription: null,
  sender: "Fintraffic",
  language: "fi",
  geometry: { type: "Point", coordinates: [24.7, 60.2] },
  roadNumbers: [1],
  releaseTime: "2026-09-14T07:00:00.000Z",
  versionTime: "2026-09-14T07:30:00.000Z",
  startsAt: "2026-09-14T06:00:00.000Z",
  endsAt: null,
};

describe("filterTrafficEvents", () => {
  it("combines category, status, severity and source-text filters", () => {
    expect(
      filterTrafficEvents([event], {
        query: "turunväylä nopeusrajoitus",
        category: "road-work",
        status: "active",
        severity: "high",
      }),
    ).toEqual([event]);
  });

  it("never exposes ended events in the live explorer", () => {
    expect(
      filterTrafficEvents(
        [{ ...event, status: "ENDED" }],
        defaultTrafficEventFilters,
      ),
    ).toEqual([]);
  });

  it("can hide both event categories without discarding the catalog", () => {
    expect(
      filterTrafficEvents([event], {
        ...defaultTrafficEventFilters,
        category: "none",
      }),
    ).toEqual([]);
  });
});
