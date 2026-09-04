import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StationDetailPanel } from "./station-detail-panel";

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
              label: "Yön 1",
              averageSpeedKmh: 93,
              flowVehiclesPerHour: 1488,
              measuredAt: "2026-09-04T09:03:35Z",
            },
            {
              direction: 2,
              label: "Yön 2",
              averageSpeedKmh: 103,
              flowVehiclesPerHour: 612,
              measuredAt: "2026-09-04T09:03:35Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Yön 1")).toBeInTheDocument();
    expect(screen.getByText("Yön 2")).toBeInTheDocument();
    expect(screen.getByText("93 km/sa")).toBeInTheDocument();
    expect(screen.getByText("612 araç/sa")).toBeInTheDocument();
  });
});
