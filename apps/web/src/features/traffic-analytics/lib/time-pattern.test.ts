import type { HistoryResponse } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  createTimePattern,
  findBusiestHour,
  findBusiestWeekday,
} from "./time-pattern";

function history(resolution: HistoryResponse["resolution"]): HistoryResponse {
  return {
    query: {
      assetIds: ["station-a"],
      metric: "vehicle-count",
      direction: 1,
      from: "2026-09-07T00:00:00.000Z",
      to: "2026-09-08T00:00:00.000Z",
      resolution,
    },
    resolution,
    timeZone: "UTC",
    coverage: {
      status: "COMPLETE",
      requestedDays: 1,
      availableDays: 1,
      missingDates: [],
      missingDetails: [],
    },
    series: [
      {
        assetId: "station-a",
        assetName: "A",
        points: [
          { timestamp: "2026-09-07T08:00:00.000Z", value: 10, sampleCount: 1 },
          { timestamp: "2026-09-07T08:30:00.000Z", value: 30, sampleCount: 1 },
          { timestamp: "2026-09-07T09:00:00.000Z", value: 40, sampleCount: 1 },
        ],
      },
    ],
    summaries: [],
  };
}

describe("createTimePattern", () => {
  it("groups real points by local weekday and hour", () => {
    const pattern = createTimePattern(history("minute"));

    expect(pattern?.populatedCellCount).toBe(2);
    expect(pattern?.cells).toContainEqual({
      dayIndex: 0,
      hour: 8,
      value: 40,
      sampleCount: 2,
      intensity: 0.55,
    });
    expect(pattern?.maximum).toBe(40);
  });

  it("does not invent an hourly pattern from daily buckets", () => {
    expect(createTimePattern(history("day"))).toBeNull();
  });
});

function historyWithPoints(
  points: HistoryResponse["series"][number]["points"],
): HistoryResponse {
  const base = history("minute");
  return { ...base, series: [{ ...base.series[0]!, points }] };
}

describe("findBusiestHour", () => {
  it("picks the hour-of-day with the highest average across all matched days", () => {
    const pattern = createTimePattern(
      historyWithPoints([
        // Monday 08:00 — busiest hour
        { timestamp: "2026-09-07T08:00:00.000Z", value: 100, sampleCount: 1 },
        // Wednesday 17:00 — quieter hour
        { timestamp: "2026-09-09T17:00:00.000Z", value: 20, sampleCount: 1 },
      ]),
    )!;

    expect(findBusiestHour(pattern)).toEqual({
      label: "08:00",
      value: 100,
      sampleCount: 1,
    });
  });

  it("returns null when there is no pattern", () => {
    expect(
      findBusiestHour({
        cells: [],
        minimum: 0,
        maximum: 0,
        populatedCellCount: 0,
      }),
    ).toBeNull();
  });
});

describe("findBusiestWeekday", () => {
  it("picks the weekday with the highest average across all matched hours", () => {
    const pattern = createTimePattern(
      historyWithPoints([
        { timestamp: "2026-09-07T08:00:00.000Z", value: 100, sampleCount: 1 },
        { timestamp: "2026-09-09T17:00:00.000Z", value: 20, sampleCount: 1 },
      ]),
    )!;

    expect(findBusiestWeekday(pattern)).toEqual({
      label: "Pazartesi",
      value: 100,
      sampleCount: 1,
    });
  });
});
