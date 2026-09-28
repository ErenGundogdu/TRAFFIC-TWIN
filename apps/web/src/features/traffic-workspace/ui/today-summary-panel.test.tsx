import type {
  AnomalyEvaluation,
  StationSummary,
  TrafficEvent,
} from "@traffic-twin/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { LiveTrafficOverview } from "../lib/live-traffic-overview";
import { TodaySummaryPanel } from "./today-summary-panel";

afterEach(cleanup);

const overview: LiveTrafficOverview = {
  totalStations: 76,
  freshStations: 63,
  flowingStations: 69,
  slowStations: 4,
  congestedStations: 0,
  insufficientStations: 3,
};

const trafficFlow = {
  status: "FREE_FLOW" as const,
  speedPercentOfFreeFlow: 90,
  flowPercentOfCapacity: 40,
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
  directions: [1, 2].map((direction) => ({
    direction: direction as 1 | 2,
    heading: null,
    averageSpeedKmh: 90,
    flowVehiclesPerHour: 900,
    measuredAt: "2026-09-23T09:00:00Z",
    trafficFlow,
  })),
  lanes: [],
};

const anomaly: AnomalyEvaluation = {
  id: "anomaly-1",
  assetId: station.id,
  direction: 1,
  metric: "average-speed-kmh",
  status: "ACTIVE",
  confidence: "HIGH",
  observedAt: "2026-09-23T09:00:00Z",
  currentValue: 25,
  expectedMedian: 80,
  expectedLowerBound: 70,
  expectedUpperBound: 90,
  absoluteDeviation: 55,
  sampleCount: 8,
  consecutiveDeviations: 2,
  minimumSamples: 6,
  requiredConsecutiveDeviations: 2,
  policyVersion: "rolling-weekly-median-mad-v1",
  baselineWindowWeeks: 12,
  baselineStart: "2026-06-24T09:00:00Z",
  baselineEnd: "2026-09-23T09:00:00Z",
  localTimeZone: "Europe/Helsinki",
  localWeekday: 3,
  localHour: 12,
};

function buildAnomaly(
  overrides: Partial<AnomalyEvaluation>,
): AnomalyEvaluation {
  return { ...anomaly, ...overrides };
}

function buildEvent(overrides: Partial<TrafficEvent>): TrafficEvent {
  return {
    id: "event-1",
    providerEventId: "provider-1",
    category: "ROAD_WORK",
    status: "ACTIVE",
    severity: "MEDIUM",
    title: "Tie 50, Kehä III, Espoo. Tietyö.",
    description: null,
    comment: null,
    effects: [],
    direction: "BOTH",
    directionDescription: null,
    sender: null,
    language: "fi",
    geometry: { type: "Point", coordinates: [24.6, 60.2] },
    roadNumbers: [50],
    releaseTime: "2026-09-23T00:00:00Z",
    versionTime: "2026-09-23T00:00:00Z",
    startsAt: "2026-09-23T00:00:00Z",
    endsAt: null,
    ...overrides,
  };
}

describe("TodaySummaryPanel", () => {
  it("shows live network counts", () => {
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[]}
        trafficEvents={[]}
        stations={[station]}
        onSelectStation={vi.fn()}
        onSelectEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("69")).toBeInTheDocument();
    expect(
      screen.getByText("63/76 istasyondan güncel ölçüm alınıyor."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Şu an olağandışı olarak işaretlenmiş bir istasyon yok.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Şu an aktif bir yol olayı yok."),
    ).toBeInTheDocument();
  });

  it("explains an active anomaly and lets the user inspect its station", () => {
    const onSelectStation = vi.fn();
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[anomaly]}
        trafficEvents={[]}
        stations={[station]}
        onSelectStation={onSelectStation}
        onSelectEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("Hız beklenenden %69 düşük")).toBeInTheDocument();
    expect(screen.getByText("25 km/sa")).toBeInTheDocument();
    expect(screen.getByText("80 km/sa")).toBeInTheDocument();
    expect(screen.getByText("Yüksek güven")).toBeInTheDocument();
    expect(screen.getByText(/8\/12\s+hafta verisi/)).toBeInTheDocument();
    expect(screen.getByText(/23 Eyl 2026/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "vt1_Espoo_Hirvisuo anomalisini incele",
      }),
    );
    expect(onSelectStation).toHaveBeenCalledWith(station.id);
  });

  it("describes an upward flow deviation with the correct unit", () => {
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[
          buildAnomaly({
            metric: "flow-vehicles-per-hour",
            currentValue: 2_256,
            expectedMedian: 2_003,
            absoluteDeviation: 253,
            sampleCount: 24,
            baselineWindowWeeks: 26,
          }),
        ]}
        trafficEvents={[]}
        stations={[station]}
        onSelectStation={vi.fn()}
        onSelectEvent={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Araç akışı beklenenden %13 yüksek"),
    ).toBeInTheDocument();
    expect(screen.getByText("2.256 araç/sa")).toBeInTheDocument();
    expect(screen.getByText("2.003 araç/sa")).toBeInTheDocument();
    expect(screen.getByText(/24\/26\s+hafta verisi/)).toBeInTheDocument();
  });

  it("collapses a station's two directions into its single worst anomaly and ranks by confidence", () => {
    const otherStation: StationSummary = {
      ...station,
      id: "fintraffic-tms:20004",
      name: "vt1_Espoo_Kasavuori",
    };
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[
          buildAnomaly({
            id: "a1",
            direction: 1,
            confidence: "LOW",
            absoluteDeviation: 10,
          }),
          buildAnomaly({
            id: "a2",
            direction: 2,
            confidence: "HIGH",
            absoluteDeviation: 55,
          }),
          buildAnomaly({
            id: "a3",
            assetId: otherStation.id,
            direction: 1,
            confidence: "MEDIUM",
            absoluteDeviation: 30,
          }),
        ]}
        trafficEvents={[]}
        stations={[station, otherStation]}
        onSelectStation={vi.fn()}
        onSelectEvent={vi.fn()}
      />,
    );

    // Only one entry for the shared station (its worse, high-confidence
    // direction), so a second distinct station gets a slot instead of a
    // repeat of the first.
    expect(screen.getAllByText("vt1_Espoo_Hirvisuo")).toHaveLength(1);
    expect(screen.getByText("vt1_Espoo_Kasavuori")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("lets the user open the anomalies beyond the top three and inspect them", () => {
    const onSelectStation = vi.fn();
    const stationsList = [1, 2, 3, 4, 5].map((n) => ({
      ...station,
      id: `fintraffic-tms:${n}`,
      name: `station-${n}`,
    }));
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={stationsList.map((item, index) =>
          buildAnomaly({
            id: `a${index}`,
            assetId: item.id,
            confidence: "HIGH",
            // expectedMedian is 80, so station-1 deviates most and station-5 least.
            currentValue: 20 + index * 10,
          }),
        )}
        trafficEvents={[]}
        stations={stationsList}
        onSelectStation={onSelectStation}
        onSelectEvent={vi.fn()}
      />,
    );

    expect(screen.queryByText("station-5")).not.toBeInTheDocument();
    const toggle = screen.getByRole("button", {
      name: "+2 istasyon daha göster",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("station-5")).toBeInTheDocument();
    fireEvent.click(screen.getByText("station-5"));
    expect(onSelectStation).toHaveBeenCalledWith("fintraffic-tms:5");

    fireEvent.click(
      screen.getByRole("button", { name: "Diğer istasyonları gizle" }),
    );
    expect(screen.queryByText("station-5")).not.toBeInTheDocument();
  });

  it("highlights the highest-severity active road event", () => {
    const onSelectEvent = vi.fn();
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[]}
        trafficEvents={[
          buildEvent({ id: "low", severity: "LOW", title: "Düşük etkili" }),
          buildEvent({ id: "high", severity: "HIGH", title: "Yüksek etkili" }),
        ]}
        stations={[station]}
        onSelectStation={vi.fn()}
        onSelectEvent={onSelectEvent}
      />,
    );

    expect(screen.getByText("Yüksek etkili")).toBeInTheDocument();
    expect(screen.queryByText("Düşük etkili")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Yüksek etkili"));
    expect(onSelectEvent).toHaveBeenCalledWith("high");
  });

  it("breaks a severity tie by picking the event with more reported effects", () => {
    const onSelectEvent = vi.fn();
    render(
      <TodaySummaryPanel
        overview={overview}
        anomalies={[]}
        trafficEvents={[
          buildEvent({
            id: "plain",
            severity: "MEDIUM",
            title: "Sade olay",
            effects: [],
          }),
          buildEvent({
            id: "restrictive",
            severity: "MEDIUM",
            title: "Kısıtlamalı olay",
            effects: ["Nopeusrajoitus", "Ajokaista suljettu"],
          }),
        ]}
        stations={[station]}
        onSelectStation={vi.fn()}
        onSelectEvent={onSelectEvent}
      />,
    );

    // Both events are MEDIUM severity, but "restrictive" has more concrete
    // reported effects (speed limit + lane closure) — so it wins the
    // tiebreak instead of "plain", which reports none.
    expect(screen.getByText("Kısıtlamalı olay")).toBeInTheDocument();
    expect(screen.queryByText("Sade olay")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Kısıtlamalı olay"));
    expect(onSelectEvent).toHaveBeenCalledWith("restrictive");
  });
});
