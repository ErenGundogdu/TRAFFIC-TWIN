import type { TrafficLane } from "@traffic-twin/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StationLaneOverview } from "./station-lane-overview";

afterEach(cleanup);

const now = new Date("2026-09-23T12:00:00Z");

function lane(overrides: Partial<TrafficLane> = {}): TrafficLane {
  return {
    lane: 1,
    direction: 1,
    directionEvidence: "OFFICIAL_LANE_LAYOUT",
    averageSpeedKmh: null,
    flowVehiclesPerHour: 1_896,
    flowWindow: "FIXED_5_MINUTES",
    measuredAt: "2026-09-23T11:59:00Z",
    ...overrides,
  };
}

describe("StationLaneOverview", () => {
  it("distinguishes missing lane speed from available flow", () => {
    render(
      <StationLaneOverview
        lanes={[lane()]}
        timeZone="Europe/Helsinki"
        now={now}
      />,
    );

    expect(screen.getByText("Şerit hız verisi yok")).toBeInTheDocument();
    expect(screen.getByText("1.896 araç/sa")).toBeInTheDocument();
    expect(screen.getByText("Güncel")).toBeInTheDocument();
    expect(screen.getByText(/23 Eyl 14:59/)).toBeInTheDocument();
  });

  it("marks a delayed lane measurement without hiding its value", () => {
    render(
      <StationLaneOverview
        lanes={[lane({ measuredAt: "2026-09-23T11:50:00Z" })]}
        timeZone="Europe/Helsinki"
        now={now}
      />,
    );

    expect(screen.getByText("Gecikmeli")).toBeInTheDocument();
    expect(screen.getByText("1.896 araç/sa")).toBeInTheDocument();
  });

  it("labels an old value as a last record instead of live flow", () => {
    render(
      <StationLaneOverview
        lanes={[
          lane({
            flowVehiclesPerHour: 12,
            measuredAt: "2026-09-22T18:19:31Z",
          }),
        ]}
        timeZone="Europe/Helsinki"
        now={now}
      />,
    );

    expect(screen.getByText("Eski ölçüm")).toBeInTheDocument();
    expect(screen.getByText("Son kayıt:")).toBeInTheDocument();
    expect(screen.getByText("12 araç/sa")).toBeInTheDocument();
    expect(screen.getByText(/22 Eyl 21:19/)).toBeInTheDocument();
  });
});
