import type { CorridorInsightResponse } from "@traffic-twin/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CorridorInsightPanel } from "./corridor-insight-panel";

const insight: CorridorInsightResponse = {
  assetId: "selected",
  roadRef: "3",
  roadContextStatus: "MATCHED",
  roadContextFreshness: "FRESH",
  generatedAt: "2026-09-22T18:00:00.000Z",
  policyVersion: "verified-road-live-corridor-v1",
  source: { roadNetwork: "OpenStreetMap", traffic: "Fintraffic TMS" },
  directions: [
    {
      direction: 1,
      status: "LOCAL_SLOWDOWN",
      selected: reading("selected", "Seçili", 5, 1, 335, 60, 0),
      peers: [
        reading("peer-a", "Komşu A", 4, 1, 340, 92, 1_200),
        reading("peer-b", "Komşu B", 13, 1, 330, 96, 2_500),
      ],
      peerMedianSpeedPercentOfFreeFlow: 94,
      selectedDifferencePercentagePoints: -34,
    },
    {
      direction: 2,
      status: "INSUFFICIENT_DATA",
      selected: reading("selected", "Seçili", 5, 2, 155, 90, 0),
      peers: [],
      peerMedianSpeedPercentOfFreeFlow: null,
      selectedDifferencePercentagePoints: null,
    },
  ],
};

afterEach(cleanup);

describe("CorridorInsightPanel", () => {
  it("explains a local slowdown without claiming a cause", () => {
    render(
      <CorridorInsightPanel
        insight={insight}
        status="ready"
        onRetry={vi.fn()}
        onSelectStation={vi.fn()}
      />,
    );

    expect(screen.getByText("Yerel yavaşlama işareti")).toBeInTheDocument();
    expect(screen.getByText(/34 yüzde puan düşük/)).toBeInTheDocument();
    expect(
      screen.getByText("Eşzamanlı hız karşılaştırmasıdır; neden göstermez."),
    ).toBeInTheDocument();
    expect(screen.getByText("Yol 3")).toBeInTheDocument();
  });

  it("lets the user open a comparable neighboring station", () => {
    const onSelectStation = vi.fn();
    render(
      <CorridorInsightPanel
        insight={insight}
        status="ready"
        onRetry={vi.fn()}
        onSelectStation={onSelectStation}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Komşu A/ }));
    expect(onSelectStation).toHaveBeenCalledWith("peer-a");
  });
});

function reading(
  assetId: string,
  name: string,
  tmsNumber: number,
  direction: 1 | 2,
  degrees: number,
  speedPercentOfFreeFlow: number,
  distanceMeters: number,
) {
  return {
    assetId,
    name,
    tmsNumber,
    direction,
    heading: {
      degrees,
      compassPoint: direction === 1 ? ("NW" as const) : ("SE" as const),
      determination:
        direction === 1
          ? ("PROVIDER_REPORTED" as const)
          : ("DERIVED_OPPOSITE" as const),
    },
    distanceMeters,
    averageSpeedKmh: speedPercentOfFreeFlow,
    speedPercentOfFreeFlow,
    flowVehiclesPerHour: 600,
    measuredAt: "2026-09-22T17:59:00.000Z",
  };
}
