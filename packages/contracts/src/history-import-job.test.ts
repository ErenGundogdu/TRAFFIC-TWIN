import { describe, expect, it } from "vitest";

import {
  createHistoryImportJobSchema,
  historyImportJobResponseSchema,
} from "./history-import-job.js";

describe("history import job contracts", () => {
  it("validates a bounded create command", () => {
    expect(
      createHistoryImportJobSchema.parse({
        assetId: "fintraffic-tms:20002",
        from: "2026-09-01",
        to: "2026-09-03",
      }),
    ).toEqual({
      assetId: "fintraffic-tms:20002",
      from: "2026-09-01",
      to: "2026-09-03",
    });
  });

  it("validates traceable progress without accepting an empty target", () => {
    const value = {
      job: {
        id: "c69f5f1c-0a39-42ec-a290-d435bfa00001",
        coverageAreaId: "helsinki",
        asset: {
          id: "fintraffic-tms:20002",
          name: "vt1_Espoo_Hirvisuo",
          tmsNumber: 20002,
        },
        range: {
          from: "2026-09-01",
          to: "2026-09-03",
          requestedDayCount: 3,
          targetDayCount: 2,
        },
        progress: {
          completedDayCount: 1,
          successfulDayCount: 1,
          failedDayCount: 0,
          skippedDayCount: 0,
          currentSourceDate: "2026-09-02",
        },
        status: "RUNNING",
        purpose: "INTERACTIVE",
        priority: 100,
        createdAt: "2026-09-04T08:00:00.000Z",
        startedAt: "2026-09-04T08:00:01.000Z",
        completedAt: null,
        updatedAt: "2026-09-04T08:00:02.000Z",
      },
    };

    expect(historyImportJobResponseSchema.parse(value)).toEqual(value);
    expect(
      historyImportJobResponseSchema.safeParse({
        ...value,
        job: {
          ...value.job,
          range: { ...value.job.range, targetDayCount: 0 },
        },
      }).success,
    ).toBe(false);
  });
});
