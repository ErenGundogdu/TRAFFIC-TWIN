import type { StationSummary } from "@traffic-twin/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StationDetailPanel } from "./station-detail-panel";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView",
);

afterEach(() => {
  cleanup();
  if (originalScrollIntoView) {
    Object.defineProperty(
      Element.prototype,
      "scrollIntoView",
      originalScrollIntoView,
    );
  } else {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  }
});

const trafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 93,
  flowPercentOfCapacity: 41,
  freeFlowSpeedKmh: 100,
  maximumFlowVehiclesPerHour: 3_600,
  policyVersion: "fintraffic-flow-v1" as const,
};

const station: StationSummary = {
  id: "fintraffic-tms:20002",
  providerStationId: 20002,
  tmsNumber: 20002,
  name: "vt1_Espoo_Hirvisuo",
  longitude: 24.637997,
  latitude: 60.220898,
  bearing: 298,
  freshness: "FRESH",
  directions: [
    {
      direction: 1,
      heading: {
        degrees: 298,
        compassPoint: "NW",
        determination: "PROVIDER_REPORTED",
      },
      averageSpeedKmh: 93,
      flowVehiclesPerHour: 1_488,
      measuredAt: "2026-09-04T09:03:35Z",
      trafficFlow,
    },
    {
      direction: 2,
      heading: {
        degrees: 118,
        compassPoint: "SE",
        determination: "DERIVED_OPPOSITE",
      },
      averageSpeedKmh: 103,
      flowVehiclesPerHour: 612,
      measuredAt: "2026-09-04T09:03:35Z",
      trafficFlow,
    },
  ],
  lanes: [
    {
      lane: 1,
      direction: 1,
      directionEvidence: "OBSERVED_PASSAGES",
      averageSpeedKmh: 91,
      flowVehiclesPerHour: 516,
      flowWindow: "ROLLING_5_MINUTES",
      measuredAt: "2026-09-04T09:03:35Z",
    },
    {
      lane: 2,
      direction: null,
      directionEvidence: null,
      averageSpeedKmh: 89,
      flowVehiclesPerHour: 420,
      flowWindow: "FIXED_5_MINUTES",
      measuredAt: "2026-09-04T09:03:35Z",
    },
  ],
};

describe("StationDetailPanel", () => {
  it("shows both directions from a recorded Fintraffic station", () => {
    render(<StationDetailPanel timeZone="Europe/Helsinki" station={station} />);

    expect(screen.getByText("Yön 1 · Kuzeybatı (298°)")).toBeInTheDocument();
    expect(screen.getByText("Yön 2 · Güneydoğu (118°)")).toBeInTheDocument();
    expect(screen.getByText("93 km/sa")).toBeInTheDocument();
    expect(screen.getByText("612 araç/sa")).toBeInTheDocument();
    expect(screen.getAllByText("Geçiş oranı")).toHaveLength(2);
    expect(screen.getAllByText("Akıcı")).toHaveLength(2);
    expect(screen.getByText("Canlı şerit görünümü")).toBeInTheDocument();
    expect(screen.getByText("Şerit 1")).toBeInTheDocument();
    expect(screen.getByText("516 araç/sa")).toBeInTheDocument();
    expect(screen.getByText(/Kayan 5 dk\./)).toBeInTheDocument();
    expect(screen.getByText(/Sabit 5 dk\./)).toBeInTheDocument();
    expect(screen.getByText("Yön 1 · geçmiş veriden")).toBeInTheDocument();
    expect(screen.getByText("Yön eşleşmesi yok")).toBeInTheDocument();
  });

  it("labels a layout-derived lane direction differently from observed evidence", () => {
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
          ...station,
          lanes: [
            {
              ...station.lanes[0]!,
              directionEvidence: "OFFICIAL_LANE_LAYOUT",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText("Yön 1 · resmî şerit sayısından"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Yön 1 · geçmiş veriden"),
    ).not.toBeInTheDocument();
  });

  it("keeps feature content in explicit accessible tabs", () => {
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={station}
        context={<section>Gerçek yol bağlamı</section>}
        insights={<section>Baseline sonucu</section>}
        notes={<section>Operatör günlüğü</section>}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Bağlam" }));
    expect(screen.getByText("Gerçek yol bağlamı")).toBeVisible();
    expect(screen.getByText("Baseline sonucu")).not.toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: "İçgörü" }));
    expect(screen.getByText("Baseline sonucu")).toBeVisible();
    expect(screen.getByRole("tab", { name: "İçgörü" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Notlar" }));
    expect(screen.getByText("Operatör günlüğü")).toBeVisible();
  });

  it("returns to the live overview when the selected station changes", () => {
    const { rerender } = render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={station}
        notes={<section>Birinci istasyon notları</section>}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Notlar" }));
    expect(screen.getByText("Birinci istasyon notları")).toBeInTheDocument();

    rerender(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
          ...station,
          id: "fintraffic-tms:20004",
          providerStationId: 20004,
          tmsNumber: 20004,
          name: "vt1_Espoo_Kasavuori",
        }}
        notes={<section>İkinci istasyon notları</section>}
      />,
    );

    expect(screen.getByRole("tab", { name: "Şimdi" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("vt1_Espoo_Kasavuori")).toBeInTheDocument();
    expect(screen.getByText("93 km/sa")).toBeInTheDocument();
    expect(screen.getByText("İkinci istasyon notları")).not.toBeVisible();
  });

  it("shows missing measurements explicitly without fabricating values", () => {
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
          ...station,
          directions: station.directions.map((direction) => ({
            ...direction,
            averageSpeedKmh: null,
            flowVehiclesPerHour: null,
            measuredAt: null,
            trafficFlow: {
              ...direction.trafficFlow,
              status: "INSUFFICIENT_DATA",
              speedPercentOfFreeFlow: null,
              flowPercentOfCapacity: null,
              freeFlowSpeedKmh: null,
              maximumFlowVehiclesPerHour: null,
            },
          })) as StationSummary["directions"],
        }}
      />,
    );

    expect(screen.getAllByText("Veri yok").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Hesaplanamadı")).toHaveLength(4);
    expect(screen.getAllByText(/Ölçüm: Ölçüm yok/)).toHaveLength(2);
  });

  it("shows a lane difference with its evidence and an inspection action", () => {
    const measuredAt = new Date().toISOString();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
          ...station,
          lanes: [
            { ...station.lanes[0]!, averageSpeedKmh: 48, measuredAt },
            {
              ...station.lanes[1]!,
              direction: 1,
              averageSpeedKmh: 90,
              measuredAt,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Yön 1 · Şerit 1")).toBeVisible();
    expect(
      screen.getByText(/Komşularından yaklaşık %47 daha yavaş/),
    ).toBeVisible();
    expect(
      screen.getByText(/olası engel veya kısmi kapanma için inceleyin/),
    ).toBeVisible();
    expect(screen.getAllByText("516 araç/sa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("420 araç/sa").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Şeritleri incele" }));
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("shows a measured comparison without claiming an incident", () => {
    const measuredAt = new Date().toISOString();
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
          ...station,
          lanes: [
            { ...station.lanes[0]!, measuredAt },
            { ...station.lanes[1]!, direction: 1, measuredAt },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Belirgin hız farkı yok/)).toBeVisible();
    expect(
      screen.getByText(/şeritler normalde eşit kullanılmak zorunda değildir/),
    ).toBeVisible();
    expect(screen.queryByText(/olası engel/)).not.toBeInTheDocument();
  });
});
