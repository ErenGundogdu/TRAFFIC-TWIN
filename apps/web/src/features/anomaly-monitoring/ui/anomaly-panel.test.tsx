import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnomalyPanel } from "./anomaly-panel";

describe("AnomalyPanel", () => {
  it("shows the evidence behind an active anomaly", () => {
    render(
      <AnomalyPanel
        evaluations={[
          {
            id: "anomaly-1",
            assetId: "fintraffic-tms:20002",
            direction: 1,
            metric: "average-speed-kmh",
            status: "ACTIVE",
            confidence: "MEDIUM",
            observedAt: "2026-09-05T09:05:00.000Z",
            currentValue: 30,
            expectedMedian: 80,
            expectedLowerBound: 75,
            expectedUpperBound: 85,
            absoluteDeviation: 50,
            sampleCount: 8,
            consecutiveDeviations: 2,
            minimumSamples: 6,
            requiredConsecutiveDeviations: 2,
            policyVersion: "rolling-weekly-median-mad-v1",
            baselineWindowWeeks: 12,
            baselineStart: "2026-06-13T09:05:00.000Z",
            baselineEnd: "2026-09-05T09:05:00.000Z",
            localTimeZone: "Europe/Helsinki",
            localWeekday: 6,
            localHour: 12,
          },
        ]}
      />,
    );

    expect(screen.getByText("Aktif anomali")).toBeInTheDocument();
    expect(screen.getByText(/8\/6 örnek/)).toBeInTheDocument();
    expect(screen.getByText(/Ardışık sapma: 2\/2/)).toBeInTheDocument();
  });
});
