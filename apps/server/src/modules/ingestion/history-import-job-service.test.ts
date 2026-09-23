import { describe, expect, it, vi } from "vitest";

import { HistoryImportJobService } from "./history-import-job-service.js";

const persistedJob = {
  id: "c69f5f1c-0a39-42ec-a290-d435bfa00001",
  coverageAreaId: "helsinki",
  assetId: "fintraffic-tms:20002",
  assetName: "vt1_Espoo_Hirvisuo",
  tmsNumber: 20002,
  fromDate: "2026-09-01",
  toDate: "2026-09-03",
  requestedDayCount: 3,
  targetDayCount: 2,
  sourceDates: ["2026-09-02", "2026-09-03"],
  completedDayCount: 0,
  successfulDayCount: 0,
  failedDayCount: 0,
  skippedDayCount: 0,
  currentSourceDate: null,
  status: "QUEUED" as const,
  purpose: "INTERACTIVE" as const,
  priority: 100,
  createdAt: new Date("2026-09-04T08:00:00Z"),
  startedAt: null,
  completedAt: null,
  updatedAt: new Date("2026-09-04T08:00:00Z"),
};

describe("HistoryImportJobService", () => {
  it("creates a job only for importable manifest days and wakes the worker", async () => {
    const create = vi.fn(async () => persistedJob);
    const onJobQueued = vi.fn();
    const service = new HistoryImportJobService(
      {
        createPlan: vi.fn(async () => ({
          coverageAreaId: "helsinki",
          timeZone: "Europe/Helsinki",
          asset: {
            id: persistedJob.assetId,
            name: persistedJob.assetName,
            tmsNumber: persistedJob.tmsNumber,
          },
          range: {
            from: persistedJob.fromDate,
            to: persistedJob.toDate,
            requestedDayCount: 3,
          },
          summary: {
            availableDayCount: 1,
            missingDayCount: 1,
            failedDayCount: 1,
            pendingProcessingDayCount: 0,
            noValidDataDayCount: 0,
            notYetAvailableDayCount: 0,
          },
          days: [
            {
              sourceDate: "2026-09-01",
              status: "AVAILABLE" as const,
              artifactId: "artifact-1",
              recordCount: 100,
              validRecordCount: 99,
              updatedAt: "2026-09-02T00:00:00.000Z",
              errorMessage: null,
            },
            {
              sourceDate: "2026-09-02",
              status: "MISSING" as const,
              artifactId: null,
              recordCount: null,
              validRecordCount: null,
              updatedAt: null,
              errorMessage: null,
            },
            {
              sourceDate: "2026-09-03",
              status: "FAILED" as const,
              artifactId: "artifact-3",
              recordCount: 0,
              validRecordCount: 0,
              updatedAt: "2026-09-04T00:00:00.000Z",
              errorMessage: "Download failed.",
            },
          ],
        })),
      },
      { create, findById: vi.fn() },
      onJobQueued,
      () => persistedJob.id,
    );

    const result = await service.createJob("helsinki", {
      assetId: persistedJob.assetId,
      from: persistedJob.fromDate,
      to: persistedJob.toDate,
    });

    expect(create).toHaveBeenCalledWith({
      id: persistedJob.id,
      coverageAreaId: "helsinki",
      assetId: persistedJob.assetId,
      fromDate: persistedJob.fromDate,
      toDate: persistedJob.toDate,
      requestedDayCount: 3,
      sourceDates: ["2026-09-02", "2026-09-03"],
      purpose: "INTERACTIVE",
      priority: 100,
    });
    expect(result.job.status).toBe("QUEUED");
    expect(onJobQueued).toHaveBeenCalledOnce();
  });

  it("does not create an empty job when every day is already usable", async () => {
    const create = vi.fn();
    const service = new HistoryImportJobService(
      {
        createPlan: vi.fn(async () => ({
          coverageAreaId: "helsinki",
          timeZone: "Europe/Helsinki",
          asset: {
            id: persistedJob.assetId,
            name: persistedJob.assetName,
            tmsNumber: persistedJob.tmsNumber,
          },
          range: {
            from: "2026-09-01",
            to: "2026-09-01",
            requestedDayCount: 1,
          },
          summary: {
            availableDayCount: 1,
            missingDayCount: 0,
            failedDayCount: 0,
            pendingProcessingDayCount: 0,
            noValidDataDayCount: 0,
            notYetAvailableDayCount: 0,
          },
          days: [
            {
              sourceDate: "2026-09-01",
              status: "AVAILABLE" as const,
              artifactId: "artifact-1",
              recordCount: 100,
              validRecordCount: 99,
              updatedAt: "2026-09-02T00:00:00.000Z",
              errorMessage: null,
            },
          ],
        })),
      },
      { create, findById: vi.fn() },
    );

    await expect(
      service.createJob("helsinki", {
        assetId: persistedJob.assetId,
        from: "2026-09-01",
        to: "2026-09-01",
      }),
    ).rejects.toThrow("bulunmuyor");
    expect(create).not.toHaveBeenCalled();
  });
});
