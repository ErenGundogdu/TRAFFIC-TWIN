import { afterEach, describe, expect, it, vi } from "vitest";

import { HistoryImportWorker } from "./history-import-worker.js";

const job = {
  id: "job-1",
  coverageAreaId: "helsinki",
  assetId: "fintraffic-tms:20002",
  fromDate: "2026-09-01",
  toDate: "2026-09-03",
  requestedDayCount: 3,
  targetDayCount: 3,
  sourceDates: ["2026-09-01", "2026-09-02", "2026-09-03"],
  completedDayCount: 0,
  successfulDayCount: 0,
  failedDayCount: 0,
  skippedDayCount: 0,
  currentSourceDate: null,
  status: "RUNNING" as const,
  purpose: "INTERACTIVE" as const,
  priority: 100,
  createdAt: new Date("2026-09-04T08:00:00Z"),
  startedAt: new Date("2026-09-04T08:00:01Z"),
  completedAt: null,
  updatedAt: new Date("2026-09-04T08:00:01Z"),
};

describe("HistoryImportWorker", () => {
  afterEach(() => vi.useRealTimers());

  it("replaces the pending poll timer when a newly queued job wakes it", async () => {
    vi.useFakeTimers();
    const claimNext = vi.fn(async () => null);
    const worker = new HistoryImportWorker(
      {
        requeueInterrupted: vi.fn(async () => undefined),
        claimNext,
        setCurrentSourceDate: vi.fn(),
        recordDayOutcome: vi.fn(),
        complete: vi.fn(),
        fail: vi.fn(),
      },
      { createPlan: vi.fn() },
      { importDay: vi.fn() },
    );

    await worker.start();
    worker.wake();
    await vi.advanceTimersByTimeAsync(0);
    await worker.stop();

    expect(claimNext).toHaveBeenCalledOnce();
  });

  it("skips newly available days, continues after a day failure and completes", async () => {
    const recordDayOutcome = vi.fn<
      (id: string, outcome: "SUCCESS" | "FAILED" | "SKIPPED") => Promise<void>
    >(async () => undefined);
    const complete = vi.fn(async () => ({ id: job.id }));
    const fail = vi.fn(async () => undefined);
    const importDay = vi
      .fn()
      .mockResolvedValueOnce({ status: "processed" })
      .mockRejectedValueOnce(new Error("upstream unavailable"));
    const worker = new HistoryImportWorker(
      {
        requeueInterrupted: vi.fn(),
        claimNext: vi.fn(async () => job),
        setCurrentSourceDate: vi.fn(async () => undefined),
        recordDayOutcome,
        complete,
        fail,
      },
      {
        createPlan: vi.fn(async () => ({
          coverageAreaId: "helsinki",
          timeZone: "Europe/Helsinki",
          asset: {
            id: job.assetId,
            name: "vt1_Espoo_Hirvisuo",
            tmsNumber: 20002,
          },
          range: {
            from: job.fromDate,
            to: job.toDate,
            requestedDayCount: 3,
          },
          summary: {
            availableDayCount: 1,
            missingDayCount: 2,
            failedDayCount: 0,
            pendingProcessingDayCount: 0,
            noValidDataDayCount: 0,
            notYetAvailableDayCount: 0,
          },
          days: [
            { sourceDate: "2026-09-01", status: "AVAILABLE" as const },
            { sourceDate: "2026-09-02", status: "MISSING" as const },
            { sourceDate: "2026-09-03", status: "MISSING" as const },
          ].map((day) => ({
            ...day,
            artifactId: null,
            recordCount: null,
            validRecordCount: null,
            updatedAt: null,
            errorMessage: null,
          })),
        })),
      },
      { importDay },
      1_000,
      vi.fn(),
    );

    await expect(worker.runOnce()).resolves.toBe(true);
    expect(importDay).toHaveBeenCalledTimes(2);
    expect(recordDayOutcome.mock.calls.map((call) => call[1])).toEqual([
      "SKIPPED",
      "SUCCESS",
      "FAILED",
    ]);
    expect(complete).toHaveBeenCalledWith(job.id);
    expect(fail).not.toHaveBeenCalled();
  });

  it("marks the job failed when the plan cannot be reconstructed", async () => {
    const fail = vi.fn(async () => undefined);
    const worker = new HistoryImportWorker(
      {
        requeueInterrupted: vi.fn(),
        claimNext: vi.fn(async () => job),
        setCurrentSourceDate: vi.fn(),
        recordDayOutcome: vi.fn(),
        complete: vi.fn(),
        fail,
      },
      {
        createPlan: vi.fn(async () => Promise.reject(new Error("scope lost"))),
      },
      { importDay: vi.fn() },
      1_000,
      vi.fn(),
    );

    await expect(worker.runOnce()).resolves.toBe(true);
    expect(fail).toHaveBeenCalledWith(job.id);
  });

  it("reports a transient queue claim failure without rejecting the worker loop", async () => {
    const onError = vi.fn();
    const worker = new HistoryImportWorker(
      {
        requeueInterrupted: vi.fn(),
        claimNext: vi.fn(async () =>
          Promise.reject(new Error("db unavailable")),
        ),
        setCurrentSourceDate: vi.fn(),
        recordDayOutcome: vi.fn(),
        complete: vi.fn(),
        fail: vi.fn(),
      },
      { createPlan: vi.fn() },
      { importDay: vi.fn() },
      1_000,
      onError,
    );

    await expect(worker.runOnce()).resolves.toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
