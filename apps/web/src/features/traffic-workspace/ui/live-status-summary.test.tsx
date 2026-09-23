import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { LiveTrafficOverview } from "../lib/live-traffic-overview";
import { LiveStatusSummary } from "./live-status-summary";

afterEach(cleanup);

const overview: LiveTrafficOverview = {
  totalStations: 76,
  freshStations: 63,
  flowingStations: 69,
  slowStations: 4,
  congestedStations: 0,
  insufficientStations: 3,
};

describe("LiveStatusSummary", () => {
  it("shows live coverage and operational counts outside replay", () => {
    render(
      <LiveStatusSummary
        overview={overview}
        mode="live"
        activeEventCount={50}
        junctionCount={5}
        timeZone="Europe/Helsinki"
      />,
    );

    expect(screen.getByText("63/76 güncel istasyon")).toBeInTheDocument();
    expect(screen.getByText("50 aktif yol olayı")).toBeInTheDocument();
  });

  it("isolates a historical replay frame from current operational context", () => {
    render(
      <LiveStatusSummary
        overview={overview}
        mode="replay"
        activeEventCount={50}
        junctionCount={5}
        timeZone="Europe/Helsinki"
        replayFrame={{
          timestamp: "2026-09-03T08:25:00.000Z",
          values: [
            {
              assetId: "fintraffic-tms:20002",
              averageSpeedKmh: 72,
              vehicleCount: 14,
              sampleCount: 14,
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("1 gerçek istasyon ölçümü")).toBeInTheDocument();
    expect(screen.queryByText("50 aktif yol olayı")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Güncel yol olayları ve saha bildirimleri/),
    ).toBeInTheDocument();
  });
});
