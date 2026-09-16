import { describe, expect, it } from "vitest";

import { trafficEventCatalogResponseSchema } from "./traffic-event.js";

describe("trafficEventCatalogResponseSchema", () => {
  it("accepts a source-traceable road event", () => {
    const result = trafficEventCatalogResponseSchema.parse({
      coverageArea: {
        id: "helsinki",
        name: "Helsinki metropol bölgesi",
        timeZone: "Europe/Helsinki",
        bbox: [24.5, 60.1, 25.25, 60.45],
      },
      source: {
        id: "fintraffic-traffic-message",
        name: "Fintraffic Digitraffic Traffic Messages",
        attribution: "Fintraffic / Digitraffic, CC BY 4.0",
        licenseUrl: "https://www.digitraffic.fi/en/terms-of-service/",
        sourceUpdatedAt: "2026-09-14T07:36:51.015Z",
        fetchedAt: "2026-09-14T07:37:00.000Z",
        freshness: "FRESH",
      },
      events: [
        {
          id: "fintraffic-traffic-message:GUID50470676",
          providerEventId: "GUID50470676",
          category: "ROAD_WORK",
          status: "UPCOMING",
          severity: "HIGH",
          title: "Tie 170, Loviisa. Tietyö.",
          description: "Tie 170 välillä Koskenkylä - Kotka, Loviisa.",
          comment: null,
          effects: ["Nopeusrajoitus"],
          direction: "BOTH",
          directionDescription: "Pernaja",
          sender: "Fintraffic Tieliikennekeskus Helsinki",
          language: "fi",
          geometry: {
            type: "LineString",
            coordinates: [
              [25.979026, 60.491785],
              [25.98009, 60.491286],
            ],
          },
          roadNumbers: [170],
          releaseTime: "2026-09-14T07:36:41.003Z",
          versionTime: "2026-09-14T07:36:41.002Z",
          startsAt: "2026-09-14T21:00:00.000Z",
          endsAt: "2026-09-15T20:59:59.999Z",
        },
      ],
    });

    expect(result.events[0]?.category).toBe("ROAD_WORK");
    expect(result.source.freshness).toBe("FRESH");
  });
});
