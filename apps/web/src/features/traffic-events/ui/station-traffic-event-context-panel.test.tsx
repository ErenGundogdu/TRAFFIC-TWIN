import type { StationTrafficEventContextResponse } from "@traffic-twin/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StationTrafficEventContextPanel } from "./station-traffic-event-context-panel";

const context: StationTrafficEventContextResponse = {
  station: { assetId: "fintraffic-tms:20002", roadRef: "1" },
  evaluatedAt: "2026-09-15T08:00:00.000Z",
  policy: {
    version: "station-event-context-v1",
    nearbyMaxDistanceMeters: 1_000,
    sameRoadMaxDistanceMeters: 5_000,
    maximumResults: 8,
  },
  matches: [
    {
      relation: "SAME_ROAD_NEARBY",
      distanceMeters: 640,
      roadMatch: true,
      matchedRoadNumber: 1,
      event: {
        id: "event-1",
        providerEventId: "1",
        category: "ROAD_WORK",
        status: "ACTIVE",
        severity: "HIGH",
        title: "Tie 1, Espoo. Tietyö.",
        description: null,
        comment: null,
        effects: [],
        direction: "BOTH",
        directionDescription: null,
        sender: "Fintraffic",
        language: "fi",
        geometry: { type: "Point", coordinates: [24.7, 60.2] },
        roadNumbers: [1],
        releaseTime: "2026-09-15T07:00:00.000Z",
        versionTime: "2026-09-15T07:30:00.000Z",
        startsAt: "2026-09-15T06:00:00.000Z",
        endsAt: null,
      },
    },
  ],
};

describe("StationTrafficEventContextPanel", () => {
  it("shows spatial evidence and opens the canonical map event", () => {
    const onSelectEvent = vi.fn();

    render(
      <StationTrafficEventContextPanel
        context={context}
        timeZone="Europe/Helsinki"
        status="ready"
        onRetry={vi.fn()}
        onSelectEvent={onSelectEvent}
      />,
    );

    expect(screen.getByText("Aynı yol · Yol 1")).toBeInTheDocument();
    expect(screen.getByText("640 m")).toBeInTheDocument();
    expect(screen.getByText(/nedensellik anlamına gelmez/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Tie 1, Espoo\. Tietyö\./ }),
    );
    expect(onSelectEvent).toHaveBeenCalledWith("event-1");
  });
});
