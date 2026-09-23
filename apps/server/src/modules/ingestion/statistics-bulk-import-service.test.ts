import { describe, expect, it, vi } from "vitest";

import {
  FintrafficStatisticsRangeError,
  type StatisticsBulkReportQuery,
} from "../providers/fintraffic/statistics-client.js";
import { StatisticsBulkImportService } from "./statistics-bulk-import-service.js";

function report(query: StatisticsBulkReportQuery) {
  const compactDate = query.from.replaceAll("-", "");
  return query.metric === "volume"
    ? `pistetunnus;pvm;suunta;Kaikki\n${query.tmsNumbers.map((number) => `${number};${compactDate};${query.direction};100`).join("\n")}`
    : `pistetunnus;pvm;suunta;Kaikki;keskinopeus_Kaikki\n${query.tmsNumbers.map((number) => `${number};${compactDate};${query.direction};98;82.4`).join("\n")}`;
}

function dependencies(tmsNumbers: number[]) {
  const completed = new Set<string>();
  const repository = {
    isChunkComplete: vi.fn(
      async (chunk: {
        assetId: string;
        from: string;
        to: string;
        direction: number;
      }) =>
        completed.has(
          `${chunk.assetId}:${chunk.from}:${chunk.to}:${chunk.direction}`,
        ),
    ),
    upsertVolumes: vi.fn(
      async (_assetId: string, rows: unknown[]) => rows.length,
    ),
    upsertSpeeds: vi.fn(
      async (_assetId: string, rows: unknown[]) => rows.length,
    ),
    markChunkComplete: vi.fn(
      async (chunk: {
        assetId: string;
        from: string;
        to: string;
        direction: number;
      }) => {
        completed.add(
          `${chunk.assetId}:${chunk.from}:${chunk.to}:${chunk.direction}`,
        );
      },
    ),
    recordFailure: vi.fn(async () => undefined),
    clearFailures: vi.fn(async () => undefined),
  };
  const stations = {
    listStations: vi.fn(async () =>
      tmsNumbers.map((tmsNumber) => ({
        id: `station-${tmsNumber}`,
        tmsNumber,
      })),
    ),
  };
  return { repository, stations };
}

describe("StatisticsBulkImportService", () => {
  it("partitions one provider response into separate station facts and checkpoints", async () => {
    const { repository, stations } = dependencies([3, 4]);
    const getBulkReport = vi.fn(async (query: StatisticsBulkReportQuery) =>
      report(query),
    );
    const service = new StatisticsBulkImportService(stations, repository, {
      getBulkReport,
    });
    const input = {
      coverageAreaId: "helsinki",
      tmsNumbers: [3, 4],
      resolution: "day" as const,
      from: "2026-08-01",
      to: "2026-08-01",
      batchSize: 2,
    };

    await expect(service.importRange(input)).resolves.toMatchObject({
      completedChunkCount: 4,
      failures: [],
    });
    expect(getBulkReport).toHaveBeenCalledTimes(4);
    expect(repository.upsertVolumes).toHaveBeenCalledTimes(4);
    expect(repository.markChunkComplete).toHaveBeenCalledTimes(4);
    await expect(service.importRange(input)).resolves.toMatchObject({
      completedChunkCount: 0,
      skippedChunkCount: 4,
    });
    expect(getBulkReport).toHaveBeenCalledTimes(4);
  });

  it("isolates a source calculation error to a single date and keeps valid volume", async () => {
    const { repository, stations } = dependencies([4]);
    const getBulkReport = vi.fn(async (query: StatisticsBulkReportQuery) => {
      if (query.metric === "speed" && query.from !== "2026-08-02") {
        throw new FintrafficStatisticsRangeError();
      }
      return report(query);
    });
    const service = new StatisticsBulkImportService(stations, repository, {
      getBulkReport,
    });

    const result = await service.importRange({
      coverageAreaId: "helsinki",
      tmsNumbers: [4],
      resolution: "day",
      from: "2026-08-01",
      to: "2026-08-02",
      batchSize: 1,
    });

    expect(result.completedChunkCount).toBe(2);
    expect(result.failures).toEqual([
      {
        tmsNumber: 4,
        direction: 1,
        metric: "speed",
        from: "2026-08-01",
        to: "2026-08-01",
        message: "Fintraffic source calculation failed.",
      },
      {
        tmsNumber: 4,
        direction: 2,
        metric: "speed",
        from: "2026-08-01",
        to: "2026-08-01",
        message: "Fintraffic source calculation failed.",
      },
    ]);
    expect(repository.upsertVolumes).toHaveBeenCalledTimes(4);
    expect(repository.upsertSpeeds).toHaveBeenCalledTimes(2);
    expect(repository.recordFailure).toHaveBeenCalledTimes(2);
  });

  it("refreshes provisional facts without creating a completion checkpoint", async () => {
    const { repository, stations } = dependencies([3]);
    const getBulkReport = vi.fn(async (query: StatisticsBulkReportQuery) =>
      report(query),
    );
    const service = new StatisticsBulkImportService(stations, repository, {
      getBulkReport,
    });
    const input = {
      coverageAreaId: "helsinki",
      tmsNumbers: [3],
      resolution: "day" as const,
      from: "2026-09-01",
      to: "2026-09-01",
      batchSize: 1,
      recordCheckpoint: false,
    };

    await service.importRange(input);
    await service.importRange(input);

    expect(repository.isChunkComplete).not.toHaveBeenCalled();
    expect(repository.markChunkComplete).not.toHaveBeenCalled();
    expect(repository.upsertVolumes).toHaveBeenCalledTimes(4);
    expect(getBulkReport).toHaveBeenCalledTimes(8);
  });
});
