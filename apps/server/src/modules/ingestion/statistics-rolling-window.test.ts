import { describe, expect, it } from "vitest";

import { resolveStatisticsRollingWindow } from "./statistics-rolling-window.js";

describe("resolveStatisticsRollingWindow", () => {
  it("uses the last complete local month for daily and hourly retention", () => {
    const now = new Date("2026-09-22T12:00:00Z");
    expect(
      resolveStatisticsRollingWindow("day", "Europe/Helsinki", now),
    ).toEqual({
      from: "2021-09-01",
      to: "2026-08-31",
    });
    expect(
      resolveStatisticsRollingWindow("hour", "Europe/Helsinki", now),
    ).toEqual({
      from: "2024-09-01",
      to: "2026-08-31",
    });
  });

  it("honors the coverage area's local month at a UTC boundary", () => {
    expect(
      resolveStatisticsRollingWindow(
        "day",
        "Europe/Helsinki",
        new Date("2026-08-31T22:30:00Z"),
      ),
    ).toEqual({ from: "2021-09-01", to: "2026-08-31" });
  });
});
