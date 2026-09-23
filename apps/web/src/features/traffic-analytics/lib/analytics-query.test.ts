import { describe, expect, it } from "vitest";

import { createAnalyticsHistoryQuery } from "./analytics-query";

describe("createAnalyticsHistoryQuery", () => {
  it("builds the same inclusive query for analysis and replay", () => {
    expect(
      createAnalyticsHistoryQuery({
        selectedStationId: "fintraffic-tms:20002",
        filters: {
          compareAssetId: "fintraffic-tms:20004",
          metric: "average-speed-kmh",
          direction: "2",
          resolution: "hour",
          fromDate: "2026-09-03",
          toDate: "2026-09-03",
        },
        timeZone: "Europe/Helsinki",
      }),
    ).toEqual({
      assetIds: ["fintraffic-tms:20002", "fintraffic-tms:20004"],
      metric: "average-speed-kmh",
      direction: 2,
      resolution: "hour",
      from: "2026-09-02T21:00:00.000Z",
      to: "2026-09-03T21:00:00.000Z",
    });
  });
});
