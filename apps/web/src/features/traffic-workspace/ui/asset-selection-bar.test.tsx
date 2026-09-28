import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetSelectionBar } from "./asset-selection-bar";

afterEach(cleanup);

const unknownTrafficFlow = {
  status: "INSUFFICIENT_DATA" as const,
  speedPercentOfFreeFlow: null,
  flowPercentOfCapacity: null,
  freeFlowSpeedKmh: null,
  maximumFlowVehiclesPerHour: null,
  policyVersion: "fintraffic-flow-v1" as const,
};

const stations = [
  {
    id: "fintraffic-tms:20002",
    providerStationId: 20002,
    tmsNumber: 20002,
    name: "vt1_Espoo_Hirvisuo",
    longitude: 24.637997,
    latitude: 60.220898,
    bearing: 298,
    freshness: "FRESH" as const,
    directions: [
      {
        direction: 1 as const,
        heading: {
          degrees: 298,
          compassPoint: "NW" as const,
          determination: "PROVIDER_REPORTED" as const,
        },
        averageSpeedKmh: 93,
        flowVehiclesPerHour: 1488,
        measuredAt: "2026-09-04T09:03:35Z",
        trafficFlow: unknownTrafficFlow,
      },
      {
        direction: 2 as const,
        heading: {
          degrees: 118,
          compassPoint: "SE" as const,
          determination: "DERIVED_OPPOSITE" as const,
        },
        averageSpeedKmh: 103,
        flowVehiclesPerHour: 612,
        measuredAt: "2026-09-04T09:03:35Z",
        trafficFlow: unknownTrafficFlow,
      },
    ],
    lanes: [],
  },
  {
    id: "fintraffic-tms:20004",
    providerStationId: 20004,
    tmsNumber: 20004,
    name: "vt1_Espoo_Kasavuori",
    longitude: 24.7,
    latitude: 60.24,
    bearing: null,
    freshness: "STALE" as const,
    directions: [
      {
        direction: 1 as const,
        heading: null,
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
        trafficFlow: unknownTrafficFlow,
      },
      {
        direction: 2 as const,
        heading: null,
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
        trafficFlow: unknownTrafficFlow,
      },
    ],
    lanes: [],
  },
];

const corridors = [
  {
    id: "road:1",
    roadRef: "1",
    stationIds: [
      "fintraffic-tms:20002",
      "fintraffic-tms:20004",
      "fintraffic-tms:20006",
    ],
  },
];

function renderBar(onSelectStation = vi.fn()) {
  render(
    <AssetSelectionBar
      stations={stations}
      junctions={[]}
      corridors={[]}
      selectedStationId={null}
      selectedJunctionId={null}
      selectedCorridorId={null}
      onSelectStation={onSelectStation}
      onSelectJunction={vi.fn()}
      onSelectCorridor={vi.fn()}
      onClearSelection={vi.fn()}
      junctionStatus="ready"
      onRetryJunctions={vi.fn()}
      corridorStatus="ready"
      onRetryCorridors={vi.fn()}
    />,
  );
}

describe("AssetSelectionBar", () => {
  it("searches the full station catalog by TMS number and selects a result", () => {
    const onSelectStation = vi.fn();
    renderBar(onSelectStation);

    fireEvent.click(
      screen.getByRole("button", {
        name: "İstasyon, kavşak veya koridor seç",
      }),
    );
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "İstasyon, kavşak veya koridor ara",
      }),
      { target: { value: "20004" } },
    );

    expect(screen.queryByText("vt1_Espoo_Hirvisuo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("vt1_Espoo_Kasavuori"));

    expect(onSelectStation).toHaveBeenCalledWith("fintraffic-tms:20004");
    expect(
      screen.queryByRole("searchbox", {
        name: "İstasyon, kavşak veya koridor ara",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows real history availability instead of live freshness in analysis mode", () => {
    render(
      <AssetSelectionBar
        stations={stations}
        junctions={[]}
        corridors={[]}
        selectedStationId={null}
        selectedJunctionId={null}
        selectedCorridorId={null}
        onSelectStation={vi.fn()}
        onSelectJunction={vi.fn()}
        onSelectCorridor={vi.fn()}
        onClearSelection={vi.fn()}
        junctionStatus="ready"
        onRetryJunctions={vi.fn()}
        corridorStatus="ready"
        onRetryCorridors={vi.fn()}
        showHistoryAvailability
        historyAvailabilityStatus="ready"
        historyAvailability={[
          {
            assetId: "fintraffic-tms:20004",
            firstDate: "2026-09-03",
            lastDate: "2026-09-03",
            availableDayCount: 1,
            availableDates: ["2026-09-03"],
          },
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "İstasyon, kavşak veya koridor seç",
      }),
    );

    expect(screen.getByText("Geçmiş · 1 gün")).toBeInTheDocument();
    expect(screen.getByText("Geçmiş yok")).toBeInTheDocument();
  });

  it("lists a verified corridor and selects it by road reference", () => {
    const onSelectCorridor = vi.fn();
    render(
      <AssetSelectionBar
        stations={stations}
        junctions={[]}
        corridors={corridors}
        selectedStationId={null}
        selectedJunctionId={null}
        selectedCorridorId={null}
        onSelectStation={vi.fn()}
        onSelectJunction={vi.fn()}
        onSelectCorridor={onSelectCorridor}
        onClearSelection={vi.fn()}
        junctionStatus="ready"
        onRetryJunctions={vi.fn()}
        corridorStatus="ready"
        onRetryCorridors={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "İstasyon, kavşak veya koridor seç",
      }),
    );
    fireEvent.click(screen.getAllByRole("button", { name: /Koridorlar/ })[0]!);

    fireEvent.click(screen.getByText("Yol 1 koridoru"));
    expect(onSelectCorridor).toHaveBeenCalledWith("road:1");
  });
});
