import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AssetSelectionBar } from "./asset-selection-bar";

afterEach(cleanup);

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
        label: "Yön 1",
        averageSpeedKmh: 93,
        flowVehiclesPerHour: 1488,
        measuredAt: "2026-09-04T09:03:35Z",
      },
      {
        direction: 2 as const,
        label: "Yön 2",
        averageSpeedKmh: 103,
        flowVehiclesPerHour: 612,
        measuredAt: "2026-09-04T09:03:35Z",
      },
    ],
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
        label: "Yön 1",
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
      },
      {
        direction: 2 as const,
        label: "Yön 2",
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
      },
    ],
  },
];

function renderBar(onSelectStation = vi.fn()) {
  render(
    <AssetSelectionBar
      stations={stations}
      junctions={[]}
      selectedStationId={null}
      selectedJunctionId={null}
      onSelectStation={onSelectStation}
      onSelectJunction={vi.fn()}
      onClearSelection={vi.fn()}
      junctionStatus="ready"
      onRetryJunctions={vi.fn()}
    />,
  );
}

describe("AssetSelectionBar", () => {
  it("searches the full station catalog by TMS number and selects a result", () => {
    const onSelectStation = vi.fn();
    renderBar(onSelectStation);

    fireEvent.click(
      screen.getByRole("button", { name: "İstasyon veya kavşak seç" }),
    );
    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "İstasyon veya kavşak ara",
      }),
      { target: { value: "20004" } },
    );

    expect(screen.queryByText("vt1_Espoo_Hirvisuo")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("vt1_Espoo_Kasavuori"));

    expect(onSelectStation).toHaveBeenCalledWith("fintraffic-tms:20004");
    expect(
      screen.queryByRole("searchbox", { name: "İstasyon veya kavşak ara" }),
    ).not.toBeInTheDocument();
  });

  it("shows real history availability instead of live freshness in analysis mode", () => {
    render(
      <AssetSelectionBar
        stations={stations}
        junctions={[]}
        selectedStationId={null}
        selectedJunctionId={null}
        onSelectStation={vi.fn()}
        onSelectJunction={vi.fn()}
        onClearSelection={vi.fn()}
        junctionStatus="ready"
        onRetryJunctions={vi.fn()}
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
      screen.getByRole("button", { name: "İstasyon veya kavşak seç" }),
    );

    expect(screen.getByText("Geçmiş · 1 gün")).toBeInTheDocument();
    expect(screen.getByText("Geçmiş yok")).toBeInTheDocument();
  });
});
