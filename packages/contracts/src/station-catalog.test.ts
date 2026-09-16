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

  it("rejects negative normalized traffic-flow ratios", () => {
    const result =
      stationCatalogResponseSchema.shape.stations.element.safeParse({
        id: "fintraffic-tms:20002",
        providerStationId: 20002,
        tmsNumber: 20002,
        name: "vt1_Espoo_Hirvisuo",
        longitude: 24.637997,
        latitude: 60.220898,
        bearing: 298,
        freshness: "FRESH",
        directions: [1, 2].map((direction) => ({
          direction,
          heading: {
            degrees: direction === 1 ? 298 : 118,
            compassPoint: direction === 1 ? "NW" : "SE",
            determination:
              direction === 1 ? "PROVIDER_REPORTED" : "DERIVED_OPPOSITE",
          },
          averageSpeedKmh: 90,
          flowVehiclesPerHour: 900,
          measuredAt: "2026-09-08T07:25:03Z",
          trafficFlow: {
            status: "FREE_FLOW",
            speedPercentOfFreeFlow: -1,
            flowPercentOfCapacity: 50,
            freeFlowSpeedKmh: 100,
            maximumFlowVehiclesPerHour: 1800,
            policyVersion: "fintraffic-flow-v1",
          },
        })),
      });

    expect(result.success).toBe(false);
  });
});
