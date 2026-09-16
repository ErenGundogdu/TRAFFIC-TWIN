import type { StationSummary } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  createDirectionSeriesLabels,
  formatStationDirectionLabel,
} from "./direction-series-labels";

const station = {
  id: "fintraffic-tms:20002",
  name: "vt1_Espoo_Hirvisuo",
  directions: [
    {
      direction: 1,
      heading: {
        degrees: 298,
        compassPoint: "NW",
        determination: "PROVIDER_REPORTED",
      },
    },
    {
      direction: 2,
      heading: {
        degrees: 118,
        compassPoint: "SE",
        determination: "DERIVED_OPPOSITE",
      },
    },
  ],
} as StationSummary;

describe("direction series labels", () => {
  it("keeps the station identity together with its own compass heading", () => {
    expect(formatStationDirectionLabel(station, 1)).toBe(
      "vt1_Espoo_Hirvisuo · Yön 1 · KB",
    );
    expect(createDirectionSeriesLabels([station], 2)).toEqual({
      "fintraffic-tms:20002": "vt1_Espoo_Hirvisuo · Yön 2 · GD",
    });
  });

  it("states when the provider heading is unavailable", () => {
    const stationWithoutHeading = {
      ...station,
      directions: station.directions.map((direction) => ({
        ...direction,
        heading: null,
      })),
    } as StationSummary;

    expect(formatStationDirectionLabel(stationWithoutHeading, 1)).toBe(
      "vt1_Espoo_Hirvisuo · Yön 1 · yön bilgisi yok",
    );
  });
});
