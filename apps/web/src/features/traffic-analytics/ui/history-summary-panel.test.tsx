import type { HistorySummary } from "@traffic-twin/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HistorySummaryPanel } from "./history-summary-panel";

const summary: HistorySummary = {
  assetId: "fintraffic-tms:20002",
  assetName: "vt1_Espoo_Hirvisuo",
  direction: 1,
  bucketCount: 60,
  sampleCount: 180,
  averageSpeedKmh: 78.4,
  medianSpeedKmh: 79.1,
  minimumSpeedKmh: 54.2,
  minimumSpeedAt: "2026-09-03T05:42:00.000Z",
  maximumSpeedKmh: 91.3,
  maximumSpeedAt: "2026-09-03T02:15:00.000Z",
  totalVehicleCount: 180,
  averageVehicleCountPerBucket: 3,
  peakVehicleCount: 8,
  peakVehicleAt: "2026-09-03T05:45:00.000Z",
  speedAtPeakVehicleCountKmh: 58.6,
  directionDistribution: {
    directionOneVehicleCount: 180,
    directionTwoVehicleCount: 220,
    directionOnePercent: 45,
    directionTwoPercent: 55,
  },
};

describe("HistorySummaryPanel", () => {
  it("explains the server-calculated summary and its data basis", () => {
    render(
      <HistorySummaryPanel
        summaries={[summary]}
        resolution="minute"
        timeZone="Europe/Helsinki"
      />,
    );

    expect(screen.getByText("Dönem özeti")).toBeInTheDocument();
    expect(screen.getByText("78,4 km/sa")).toBeInTheDocument();
    expect(screen.getByText("180 araç")).toBeInTheDocument();
    expect(screen.getByText("%45 / %55")).toBeInTheDocument();
    expect(screen.getByText(/180 geçerli örnek/)).toBeInTheDocument();
    expect(screen.getAllByText(/En yoğun dilim/)).toHaveLength(2);
  });

  it("keeps missing measurements explicit", () => {
    render(
      <HistorySummaryPanel
        summaries={[
          {
            ...summary,
            bucketCount: 0,
            sampleCount: 0,
            averageSpeedKmh: null,
            medianSpeedKmh: null,
            minimumSpeedKmh: null,
            minimumSpeedAt: null,
            maximumSpeedKmh: null,
            maximumSpeedAt: null,
            totalVehicleCount: 0,
            averageVehicleCountPerBucket: null,
            peakVehicleCount: null,
            peakVehicleAt: null,
            speedAtPeakVehicleCountKmh: null,
            directionDistribution: {
              directionOneVehicleCount: 0,
              directionTwoVehicleCount: 0,
              directionOnePercent: null,
              directionTwoPercent: null,
            },
          },
        ]}
        resolution="hour"
        timeZone="Europe/Helsinki"
      />,
    );

    expect(screen.getByText("Yetersiz veri")).toBeInTheDocument();
    expect(screen.getByText(/gerçek ölçüm bulunmuyor/)).toBeInTheDocument();
  });
});
