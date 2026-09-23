import type { JunctionSummary } from "@traffic-twin/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JunctionDetailPanel } from "./junction-detail-panel";

const junction: JunctionSummary = {
  id: "junction-1",
  osmRelationId: "123456",
  name: "Hakamäentie liittymä",
  longitude: 24.9,
  latitude: 60.2,
  roadRefs: ["1", "3"],
  coverage: "FULL",
  policyVersion: "osm-road-ref-distance-bearing-v1",
  sourceUpdatedAt: "2026-09-22T18:00:00.000Z",
  sensors: [
    {
      assetId: "fintraffic-tms:1",
      name: "vt1_Espoo_Hirvisuo",
      roadRef: "1",
      distanceMeters: 120,
      bearingDifferenceDegrees: 5,
      confidence: "HIGH",
    },
  ],
};

afterEach(cleanup);

describe("JunctionDetailPanel", () => {
  it("shows road references directly but keeps the raw policy id tucked away", () => {
    render(<JunctionDetailPanel junction={junction} />);

    expect(screen.getByText("1, 3")).toBeInTheDocument();
    expect(
      screen.queryByText("osm-road-ref-distance-bearing-v1"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Eşleştirme ayrıntısı")).toBeInTheDocument();
  });
});
