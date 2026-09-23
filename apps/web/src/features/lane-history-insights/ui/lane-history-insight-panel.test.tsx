import { render, screen } from "@testing-library/react";
import type {
  LaneHistoryInsightResponse,
  TrafficDirection,
} from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import { LaneHistoryInsightPanel } from "./lane-history-insight-panel";

const directions: TrafficDirection[] = [
  {
    direction: 1,
    heading: null,
    averageSpeedKmh: 70,
    flowVehiclesPerHour: 300,
    measuredAt: "2026-09-22T10:00:00.000Z",
    trafficFlow: {
      status: "FREE_FLOW",
      speedPercentOfFreeFlow: null,
      flowPercentOfCapacity: null,
      freeFlowSpeedKmh: null,
      maximumFlowVehiclesPerHour: null,
      policyVersion: "fintraffic-flow-v1",
    },
  },
  {
    direction: 2,
    heading: null,
    averageSpeedKmh: null,
    flowVehiclesPerHour: null,
    measuredAt: null,
    trafficFlow: {
      status: "INSUFFICIENT_DATA",
      speedPercentOfFreeFlow: null,
      flowPercentOfCapacity: null,
      freeFlowSpeedKmh: null,
      maximumFlowVehiclesPerHour: null,
      policyVersion: "fintraffic-flow-v1",
    },
  },
];

function insight(
  state: "INSUFFICIENT_DATA" | "LOW",
): LaneHistoryInsightResponse {
  const enough = state === "LOW";
  return {
    assetId: "fintraffic-tms:23005",
    generatedAt: "2026-09-22T10:00:00.000Z",
    timeZone: "Europe/Helsinki",
    localWeekday: 2,
    localHour: 13,
    baselineStart: "2026-06-30T10:00:00.000Z",
    baselineEnd: "2026-09-22T10:00:00.000Z",
    baselineWindowWeeks: 12,
    minimumSamples: 6,
    policyVersion: "lane-hourly-median-mad-v1",
    evaluations: [
      {
        lane: 1,
        direction: 1,
        measuredAt: "2026-09-22T10:00:00.000Z",
        speed: {
          currentValue: 45,
          expectedMedian: enough ? 70 : null,
          expectedLowerBound: enough ? 65 : null,
          expectedUpperBound: enough ? 75 : null,
          state,
          sampleCount: enough ? 8 : 1,
        },
        flow: {
          currentValue: 300,
          expectedMedian: enough ? 290 : null,
          expectedLowerBound: enough ? 230 : null,
          expectedUpperBound: enough ? 350 : null,
          state: enough ? "EXPECTED" : "INSUFFICIENT_DATA",
          sampleCount: enough ? 8 : 1,
        },
      },
    ],
  };
}

describe("LaneHistoryInsightPanel", () => {
  it("explains when history cannot support a conclusion", () => {
    render(
      <LaneHistoryInsightPanel
        insight={insight("INSUFFICIENT_DATA")}
        directions={directions}
        status="ready"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Yeterli geçmiş henüz birikmedi")).toBeVisible();
    expect(screen.getByText(/en fazla 1\/6 geçmiş örnek/)).toBeVisible();
  });

  it("shows separate speed and flow readings when a baseline exists", () => {
    render(
      <LaneHistoryInsightPanel
        insight={insight("LOW")}
        directions={directions}
        status="ready"
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Olağandan düşük")).toBeVisible();
    expect(screen.getByText("Olağan aralıkta")).toBeVisible();
    expect(screen.getByText(/olağan 65–75 km\/sa/)).toBeVisible();
  });
});
