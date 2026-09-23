import { describe, expect, it } from "vitest";

import { resolveRecentDailyStatisticsRanges } from "./recent-statistics-window.js";

describe("recent daily statistics window", () => {
  it("refreshes the open month and finalizes the previous month in coverage time", () => {
    expect(
      resolveRecentDailyStatisticsRanges(
        "Europe/Helsinki",
        new Date("2026-09-22T06:00:00.000Z"),
      ),
    ).toEqual([
      {
        from: "2026-08-01",
        to: "2026-08-31",
        recordCheckpoint: true,
      },
      {
        from: "2026-09-01",
        to: "2026-09-21",
        recordCheckpoint: false,
      },
    ]);
  });

  it("waits for the third local day before finalizing a closed month", () => {
    expect(
      resolveRecentDailyStatisticsRanges(
        "Europe/Helsinki",
        new Date("2026-09-30T21:30:00.000Z"),
      ),
    ).toEqual([
      {
        from: "2026-09-01",
        to: "2026-09-30",
        recordCheckpoint: false,
      },
    ]);
    expect(
      resolveRecentDailyStatisticsRanges(
        "Europe/Helsinki",
        new Date("2026-10-02T21:30:00.000Z"),
      )[0],
    ).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      recordCheckpoint: true,
    });
  });
});
