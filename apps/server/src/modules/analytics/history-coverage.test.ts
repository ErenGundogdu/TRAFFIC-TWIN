import { describe, expect, it } from "vitest";

import { describeHistoryCoverage } from "./history-coverage.js";

describe("describeHistoryCoverage", () => {
  it("distinguishes a completed source gap from a date not imported", () => {
    expect(
      describeHistoryCoverage({
        assetIds: ["a", "b"],
        requestedDates: ["2026-09-01", "2026-09-02"],
        availableDates: [
          { assetId: "a", sourceDate: "2026-09-01" },
          { assetId: "b", sourceDate: "2026-09-01" },
          { assetId: "a", sourceDate: "2026-09-02" },
        ],
        completedChunks: [
          { assetId: "b", fromDate: "2026-09-01", toDate: "2026-09-02" },
        ],
        failedRanges: [],
        resolution: "day",
      }),
    ).toEqual({
      status: "PARTIAL",
      requestedDays: 2,
      availableDays: 1,
      missingDates: ["2026-09-02"],
      missingDetails: [
        { assetId: "b", date: "2026-09-02", reason: "SOURCE_GAP" },
      ],
    });
  });

  it("does not call a missing minute an import gap without evidence", () => {
    const result = describeHistoryCoverage({
      assetIds: ["a"],
      requestedDates: ["2026-09-02"],
      availableDates: [],
      completedChunks: [],
      failedRanges: [],
      resolution: "minute",
    });
    expect(result.missingDetails).toEqual([
      { assetId: "a", date: "2026-09-02", reason: "UNVERIFIED" },
    ]);
  });

  it("identifies a date outside completed chunks as not imported", () => {
    const result = describeHistoryCoverage({
      assetIds: ["a"],
      requestedDates: ["2026-09-02"],
      availableDates: [],
      completedChunks: [
        { assetId: "a", fromDate: "2026-09-03", toDate: "2026-09-04" },
      ],
      failedRanges: [],
      resolution: "hour",
    });
    expect(result.missingDetails[0]?.reason).toBe("NOT_IMPORTED");
  });

  it("marks a failed provider report without calling it an empty measurement", () => {
    const result = describeHistoryCoverage({
      assetIds: ["a"],
      requestedDates: ["2026-09-02"],
      availableDates: [],
      completedChunks: [],
      failedRanges: [
        { assetId: "a", fromDate: "2026-09-02", toDate: "2026-09-02" },
      ],
      resolution: "day",
    });
    expect(result.missingDetails[0]?.reason).toBe("SOURCE_ERROR");
  });
});
