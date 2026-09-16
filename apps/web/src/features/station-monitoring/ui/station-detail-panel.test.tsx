import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StationDetailPanel } from "./station-detail-panel";

const trafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 93,
  flowPercentOfCapacity: 41,
  freeFlowSpeedKmh: 100,
  maximumFlowVehiclesPerHour: 3_600,
  policyVersion: "fintraffic-flow-v1" as const,
};

describe("StationDetailPanel", () => {
  it("shows both directions from a recorded Fintraffic station", () => {
    render(
      <StationDetailPanel
        timeZone="Europe/Helsinki"
        station={{
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
              flowVehiclesPerHour: 1488,
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
        }}
      />,
    );

    expect(screen.getByText("Yön 1 · Kuzeybatı (298°)")).toBeInTheDocument();
    expect(screen.getByText("Yön 2 · Güneydoğu (118°)")).toBeInTheDocument();
    expect(screen.getByText("93 km/sa")).toBeInTheDocument();
    expect(screen.getByText("612 araç/sa")).toBeInTheDocument();
    expect(screen.getAllByText("Geçiş oranı")).toHaveLength(2);
    expect(screen.getAllByText("Akıcı")).toHaveLength(2);
    expect(screen.getAllByText("Serbest akışa göre hız")).toHaveLength(2);
    expect(screen.getAllByText("Kapasite kullanımı")).toHaveLength(2);
    expect(
      screen.getAllByText("Son 5 dk. temposunun saatlik karşılığı"),
    ).toHaveLength(2);
  });
});
