import { describe, expect, it } from "vitest";

import {
  historyImportPlanQuerySchema,
  historyImportPlanResponseSchema,
} from "./history-import-plan.js";

describe("history import plan contracts", () => {
  it("accepts an inclusive date range and a traceable plan response", () => {
    expect(
      historyImportPlanQuerySchema.parse({
        assetId: "fintraffic-tms:20002",
        from: "2026-09-01",
        to: "2026-09-03",
      }),
    ).toEqual({
      assetId: "fintraffic-tms:20002",
      from: "2026-09-01",
      to: "2026-09-03",
    });

    expect(() =>
      historyImportPlanResponseSchema.parse({
        coverageAreaId: "helsinki",
        timeZone: "Europe/Helsinki",
        asset: {
          id: "fintraffic-tms:20002",
          name: "vt1_Espoo_Hirvisuo",
          tmsNumber: 20002,
        },
        range: {
          from: "2026-09-01",
          to: "2026-09-03",
          requestedDayCount: 3,
        },
        summary: {
          availableDayCount: 1,
          missingDayCount: 1,
          failedDayCount: 1,
          pendingProcessingDayCount: 0,
          noValidDataDayCount: 0,
        },
        days: [
          {
            sourceDate: "2026-09-01",
            status: "AVAILABLE",
            artifactId: "artifact-1",
            recordCount: 100,
            validRecordCount: 99,
            updatedAt: "2026-09-02T00:00:00.000Z",
            errorMessage: null,
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects reversed and excessively large ranges", () => {
    expect(
      historyImportPlanQuerySchema.safeParse({
        assetId: "fintraffic-tms:20002",
        from: "2026-09-04",
        to: "2026-09-03",
      }).success,
    ).toBe(false);
    expect(
      historyImportPlanQuerySchema.safeParse({
        assetId: "fintraffic-tms:20002",
        from: "2025-01-01",
        to: "2026-09-03",
      }).success,
    ).toBe(false);
  });
});
