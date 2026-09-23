import type { HistoryResponse } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import { getReplayAvailability } from "./replay-availability";

describe("getReplayAvailability", () => {
  it("rejects daily summaries even when they contain a point", () => {
    const result = getReplayAvailability(
      history({
        resolution: "day",
        timestamps: ["2026-09-22T00:00:00.000Z"],
      }),
    );

    expect(result).toMatchObject({
      available: false,
      reason: "FINE_RESOLUTION_REQUIRED",
      resolution: null,
      frameCount: 1,
    });
  });

  it("requires at least two distinct minute frames", () => {
    const result = getReplayAvailability(
      history({
        resolution: "minute",
        timestamps: ["2026-09-22T08:00:00.000Z"],
      }),
    );

    expect(result).toMatchObject({
      available: false,
      reason: "NOT_ENOUGH_FRAMES",
      frameCount: 1,
    });
  });

  it("accepts a short range with multiple minute frames", () => {
    const result = getReplayAvailability(
      history({
        resolution: "minute",
        timestamps: ["2026-09-22T08:00:00.000Z", "2026-09-22T08:01:00.000Z"],
      }),
    );

    expect(result).toMatchObject({
      available: true,
      reason: "AVAILABLE",
      resolution: "minute",
      frameCount: 2,
    });
  });

  it("accepts hour-resolution data drawn from the bulk statistics import", () => {
    const result = getReplayAvailability(
      history({
        resolution: "hour",
        timestamps: ["2026-09-22T08:00:00.000Z", "2026-09-22T09:00:00.000Z"],
      }),
    );

    expect(result).toMatchObject({
      available: true,
      reason: "AVAILABLE",
      resolution: "hour",
      frameCount: 2,
    });
  });

  it("requires at least two distinct hour frames", () => {
    const result = getReplayAvailability(
      history({
        resolution: "hour",
        timestamps: ["2026-09-22T08:00:00.000Z"],
      }),
    );

    expect(result).toMatchObject({
      available: false,
      reason: "NOT_ENOUGH_FRAMES",
      resolution: "hour",
      frameCount: 1,
    });
  });

  it("accepts up to thirty days of hour-resolution data", () => {
    const result = getReplayAvailability(
      history({
        resolution: "hour",
        timestamps: ["2026-08-01T08:00:00.000Z", "2026-08-01T09:00:00.000Z"],
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-31T00:00:00.000Z",
      }),
    );

    expect(result).toMatchObject({ available: true, reason: "AVAILABLE" });
  });

  it("rejects hour-resolution ranges longer than thirty days", () => {
    const result = getReplayAvailability(
      history({
        resolution: "hour",
        timestamps: ["2026-08-01T08:00:00.000Z", "2026-08-01T09:00:00.000Z"],
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      }),
    );

    expect(result).toMatchObject({
      available: false,
      reason: "RANGE_TOO_LONG",
      resolution: "hour",
    });
    expect(result.message).toContain("30 günlük");
  });

  it("still rejects minute-resolution ranges longer than two days", () => {
    const result = getReplayAvailability(
      history({
        resolution: "minute",
        timestamps: ["2026-09-22T08:00:00.000Z", "2026-09-22T08:01:00.000Z"],
        from: "2026-09-22T00:00:00.000Z",
        to: "2026-09-25T00:00:00.000Z",
      }),
    );

    expect(result).toMatchObject({
      available: false,
      reason: "RANGE_TOO_LONG",
      resolution: "minute",
    });
    expect(result.message).toContain("2 günlük");
  });
});

function history({
  resolution,
  timestamps,
  from = "2026-09-22T00:00:00.000Z",
  to = "2026-09-23T00:00:00.000Z",
}: {
  resolution: HistoryResponse["resolution"];
  timestamps: string[];
  from?: string;
  to?: string;
}): HistoryResponse {
  return {
    query: {
      assetIds: ["station"],
      metric: "average-speed-kmh",
      direction: 1,
      resolution,
      from,
      to,
    },
    resolution,
    timeZone: "Europe/Helsinki",
    coverage: {
      status: "COMPLETE",
      requestedDays: 1,
      availableDays: 1,
      missingDates: [],
      missingDetails: [],
    },
    series: [
      {
        assetId: "station",
        assetName: "Hirvisuo",
        points: timestamps.map((timestamp) => ({
          timestamp,
          value: 80,
          sampleCount: 1,
        })),
      },
    ],
    summaries: [],
  };
}
