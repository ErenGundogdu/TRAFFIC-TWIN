import { describe, expect, it } from "vitest";

import { stationCatalogResponseSchema } from "./station-catalog.js";

describe("stationCatalogResponseSchema", () => {
  it("rejects a station without both explicit directions", () => {
    const result = stationCatalogResponseSchema.safeParse({
      coverageArea: {
        id: "helsinki",
        name: "Helsinki metropol bölgesi",
        timeZone: "Europe/Helsinki",
        bbox: [24.5, 60.1, 25.25, 60.45],
      },
      source: {
        id: "fintraffic-tms",
        name: "Fintraffic Digitraffic TMS",
        attribution: "Fintraffic / Digitraffic",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        status: "AVAILABLE",
        updatedAt: "2026-09-04T09:03:45Z",
        fetchedAt: "2026-09-04T09:04:00Z",
      },
      stations: [
        {
          id: "fintraffic-tms:20002",
          providerStationId: 20002,
          tmsNumber: 20002,
          name: "vt1_Espoo_Hirvisuo",
          longitude: 24.637997,
          latitude: 60.220898,
          bearing: 298,
          freshness: "FRESH",
          directions: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
