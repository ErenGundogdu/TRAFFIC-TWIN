import { describe, expect, it } from "vitest";

import {
  analyticsFilterSchema,
  createInclusiveHistoryRange,
  parseAnalyticsUrlFilters,
} from "./analytics-filters";

describe("analytics filters", () => {
  it("accepts a single inclusive calendar day", () => {
    expect(
      analyticsFilterSchema.safeParse({
        compareAssetId: "",
        metric: "average-speed-kmh",
        direction: "1",
        resolution: "minute",
        fromDate: "2026-09-03",
        toDate: "2026-09-03",
      }).success,
    ).toBe(true);
  });

  it("converts the inclusive UI end date to the exclusive API boundary", () => {
    expect(
      createInclusiveHistoryRange(
        "2026-09-03",
        "2026-09-04",
        "Europe/Helsinki",
      ),
    ).toEqual({
      from: "2026-09-02T21:00:00.000Z",
      to: "2026-09-04T21:00:00.000Z",
    });
  });

  it("falls back safely and reports invalid shared-link filters", () => {
    const params = new URLSearchParams({
      metric: "broken",
      resolution: "weekly",
      direction: "3",
      from: "not-a-date",
      to: "2026-09-03",
    });

    expect(
      parseAnalyticsUrlFilters(params, {
        compareAssetId: "",
        defaultDate: "2026-09-03",
        comparisonWasIgnored: true,
      }),
    ).toEqual({
      values: {
        compareAssetId: "",
        metric: "average-speed-kmh",
        direction: "1",
        resolution: "auto",
        fromDate: "2026-09-03",
        toDate: "2026-09-03",
      },
      ignoredParameters: [
        "metric",
        "resolution",
        "direction",
        "from",
        "compare",
      ],
    });
  });

  it("resets reversed URL dates before they can create an invalid query", () => {
    const params = new URLSearchParams({
      from: "2026-09-04",
      to: "2026-09-03",
    });

    const parsed = parseAnalyticsUrlFilters(params, {
      compareAssetId: "",
      defaultDate: "2026-09-02",
    });

    expect(parsed.values.fromDate).toBe("2026-09-02");
    expect(parsed.values.toDate).toBe("2026-09-02");
    expect(parsed.ignoredParameters).toEqual(["from", "to"]);
  });
});
