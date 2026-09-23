import { describe, expect, it, vi } from "vitest";

import { RecentStatisticsPoller } from "./recent-statistics-poller.js";

const noFailures = {
  stationCount: 2,
  completedChunkCount: 4,
  skippedChunkCount: 0,
  failures: [],
};

function stations() {
  return {
    findCoverageArea: vi.fn(async () => ({ timeZone: "Europe/Helsinki" })),
    listStations: vi.fn(async () => [
      { tmsNumber: 20004 },
      { tmsNumber: 20002 },
    ]),
  };
}

describe("RecentStatisticsPoller", () => {
  it("catches up the open month for every catalog station without finalizing it", async () => {
    const importer = { importRange: vi.fn(async () => noFailures) };
    const poller = new RecentStatisticsPoller(
      "helsinki",
      86_400_000,
      10,
      stations(),
      importer,
      () => new Date("2026-09-22T06:00:00.000Z"),
    );

    await poller.runOnce();

    expect(importer.importRange).toHaveBeenNthCalledWith(1, {
      coverageAreaId: "helsinki",
      tmsNumbers: [20002, 20004],
      resolution: "day",
      batchSize: 10,
      from: "2026-08-01",
      to: "2026-08-31",
      recordCheckpoint: true,
    });
    expect(importer.importRange).toHaveBeenNthCalledWith(2, {
      coverageAreaId: "helsinki",
      tmsNumbers: [20002, 20004],
      resolution: "day",
      batchSize: 10,
      from: "2026-09-01",
      to: "2026-09-21",
      recordCheckpoint: false,
    });
  });

  it("still tries the open month if the previous month fails", async () => {
    const onError = vi.fn();
    const importer = {
      importRange: vi
        .fn()
        .mockRejectedValueOnce(new Error("upstream unavailable"))
        .mockResolvedValueOnce(noFailures),
    };
    const poller = new RecentStatisticsPoller(
      "helsinki",
      86_400_000,
      10,
      stations(),
      importer,
      () => new Date("2026-09-22T06:00:00.000Z"),
      onError,
    );

    await expect(poller.runOnce()).resolves.toEqual([noFailures]);
    expect(importer.importRange).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
