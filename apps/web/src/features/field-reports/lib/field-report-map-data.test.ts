import type { FieldReport } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { createFieldReportGeoJson } from "./field-report-map-data";

const report = (id: string, status: FieldReport["status"]): FieldReport => ({
  id,
  coverageAreaId: "helsinki",
  source: "OPERATOR",
  author: "Eren",
  category: "CONGESTION",
  severity: "MEDIUM",
  status,
  description: "Trafik yavaş ilerliyor.",
  location: { longitude: 24.94, latitude: 60.17 },
  observedAt: "2026-09-15T08:00:00.000Z",
  createdAt: "2026-09-15T08:00:00.000Z",
});

describe("field report map data", () => {
  it("keeps live review states and excludes rejected or resolved reports", () => {
    const geoJson = createFieldReportGeoJson(
      [
        report("pending", "PENDING_REVIEW"),
        report("verified", "VERIFIED"),
        report("rejected", "REJECTED"),
        report("resolved", "RESOLVED"),
      ],
      "verified",
    );

    expect(geoJson.features.map((feature) => feature.properties.id)).toEqual([
      "pending",
      "verified",
    ]);
    expect(geoJson.features[1]?.properties.selected).toBe(true);
  });
});
