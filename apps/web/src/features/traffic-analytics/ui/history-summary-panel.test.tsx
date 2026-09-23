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
  composition: {
    classifiedVehicleCount: 0,
    classificationCoveragePercent: null,
    vehicleClasses: [],
    lanes: [],
    laneVehicleClasses: [],
    freightProxy: {
      vehicleCount: 0,
      sharePercent: null,
      policyVersion: "fintraffic-freight-proxy-v1",
    },
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

    expect(screen.getByText("İstasyon ayrıntıları")).toBeInTheDocument();
    expect(
      screen.getByText(/gerçek dakika agregalarından sunucuda hesaplandı/),
    ).toBeInTheDocument();
    expect(screen.getByText("79,1 km/sa")).toBeInTheDocument();
    expect(
      screen.getByText(/Ağırlıklı ortalama 78,4 km\/sa/),
    ).toBeInTheDocument();
    expect(screen.getByText("%45 / %55")).toBeInTheDocument();
    expect(screen.getByText(/180 geçerli örnek/)).toBeInTheDocument();
    expect(screen.getByText(/En yoğun dilim/)).toBeInTheDocument();
  });

  it("shows raw-derived vehicle class and lane composition when available", () => {
    render(
      <HistorySummaryPanel
        summaries={[
          {
            ...summary,
            composition: {
              classifiedVehicleCount: 100,
              classificationCoveragePercent: 100,
              vehicleClasses: [
                {
                  key: 1,
                  vehicleCount: 70,
                  sharePercent: 70,
                  averageSpeedKmh: 82,
                },
                {
                  key: 2,
                  vehicleCount: 30,
                  sharePercent: 30,
                  averageSpeedKmh: 75,
                },
              ],
              lanes: [
                {
                  key: 1,
                  vehicleCount: 60,
                  sharePercent: 60,
                  averageSpeedKmh: 80,
                },
              ],
              laneVehicleClasses: [
                {
                  lane: 1,
                  vehicleClass: 2,
                  vehicleCount: 30,
                  sharePercent: 30,
                  averageSpeedKmh: 75,
                },
              ],
              freightProxy: {
                vehicleCount: 30,
                sharePercent: 30,
                policyVersion: "fintraffic-freight-proxy-v1",
              },
            },
          },
        ]}
        resolution="hour"
        timeZone="Europe/Helsinki"
      />,
    );

    expect(screen.getByText("Araç ve şerit dağılımı")).toBeInTheDocument();
    expect(screen.getByText("Kamyon")).toBeInTheDocument();
    expect(screen.getByText("Şerit 1")).toBeInTheDocument();
    expect(screen.getByText("Şerit 1 · Kamyon")).toBeInTheDocument();
    expect(
      screen.getByText(/ithalat veya ihracat miktarı değildir/),
    ).toBeInTheDocument();
  });

  it("rolls up vehicle classes and lanes beyond the top rows into an explicit remainder", () => {
    render(
      <HistorySummaryPanel
        summaries={[
          {
            ...summary,
            composition: {
              classifiedVehicleCount: 100,
              classificationCoveragePercent: 100,
              vehicleClasses: [
                { key: 1, vehicleCount: 30, sharePercent: 30 },
                { key: 2, vehicleCount: 25, sharePercent: 25 },
                { key: 3, vehicleCount: 20, sharePercent: 20 },
                { key: 4, vehicleCount: 15, sharePercent: 15 },
                { key: 5, vehicleCount: 6, sharePercent: 6 },
                { key: 6, vehicleCount: 3, sharePercent: 3 },
                { key: 7, vehicleCount: 1, sharePercent: 1 },
              ].map((item) => ({ ...item, averageSpeedKmh: 80 })),
              lanes: [],
              laneVehicleClasses: [],
              freightProxy: {
                vehicleCount: 0,
                sharePercent: 0,
                policyVersion: "fintraffic-freight-proxy-v1",
              },
            },
          },
        ]}
        resolution="hour"
        timeZone="Europe/Helsinki"
      />,
    );

    expect(screen.getByText("Diğer sınıflar (2)")).toBeInTheDocument();
    expect(screen.getByText("%4")).toBeInTheDocument();
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
