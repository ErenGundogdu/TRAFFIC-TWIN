import { describe, expect, it } from "vitest";

import { evaluateAnomaly } from "./anomaly-engine.js";

const baseline = [78, 80, 79, 81, 80, 82, 79, 80].map((value, index) => ({
  timestamp: `2026-0${index + 1}-01T08:00:00.000Z`,
  value,
}));

describe("evaluateAnomaly", () => {
  it("does not invent an anomaly without the minimum baseline", () => {
    const result = evaluateAnomaly({
      metric: "average-speed-kmh",
      currentValue: 20,
      baselineSamples: baseline.slice(0, 5),
      previousConsecutiveDeviations: 1,
    });

    expect(result.status).toBe("INSUFFICIENT_DATA");
    expect(result.expectedMedian).toBeNull();
    expect(result.consecutiveDeviations).toBe(0);
  });

  it("keeps ordinary high volume separate from anomaly", () => {
    const result = evaluateAnomaly({
      metric: "flow-vehicles-per-hour",
      currentValue: 1_010,
      baselineSamples: baseline.map((sample) => ({
        ...sample,
        value: sample.value + 920,
      })),
      previousConsecutiveDeviations: 0,
    });

    expect(result.status).toBe("NORMAL");
  });

  it("requires two consecutive robust deviations before activation", () => {
    const candidate = evaluateAnomaly({
      metric: "average-speed-kmh",
      currentValue: 30,
      baselineSamples: baseline,
      previousConsecutiveDeviations: 0,
    });
    const active = evaluateAnomaly({
      metric: "average-speed-kmh",
      currentValue: 28,
      baselineSamples: baseline,
      previousConsecutiveDeviations: candidate.consecutiveDeviations,
    });

    expect(candidate.status).toBe("CANDIDATE");
    expect(active.status).toBe("ACTIVE");
    expect(active.expectedMedian).toBe(80);
    expect(active.sampleCount).toBe(8);
  });

  it("resets persistence when a value returns to its expected range", () => {
    const result = evaluateAnomaly({
      metric: "average-speed-kmh",
      currentValue: 81,
      baselineSamples: baseline,
      previousConsecutiveDeviations: 4,
    });

    expect(result.status).toBe("NORMAL");
    expect(result.consecutiveDeviations).toBe(0);
  });
});
