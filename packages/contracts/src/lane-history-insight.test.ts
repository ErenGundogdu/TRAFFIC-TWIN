import { describe, expect, it } from "vitest";

import { laneHistoryInsightResponseSchema } from "./lane-history-insight.js";

describe("laneHistoryInsightResponseSchema", () => {
  it("accepts an explicit insufficient-data result", () => {
    expect(
      laneHistoryInsightResponseSchema.parse({
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
              currentValue: 72,
              expectedMedian: null,
              expectedLowerBound: null,
              expectedUpperBound: null,
              state: "INSUFFICIENT_DATA",
              sampleCount: 1,
            },
            flow: {
              currentValue: 240,
              expectedMedian: null,
              expectedLowerBound: null,
              expectedUpperBound: null,
              state: "INSUFFICIENT_DATA",
              sampleCount: 1,
            },
          },
        ],
      }).evaluations[0]?.speed.state,
    ).toBe("INSUFFICIENT_DATA");
  });
});
