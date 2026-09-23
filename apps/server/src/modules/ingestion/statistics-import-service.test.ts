import { describe, expect, it, vi } from "vitest";

import type { StatisticsReportQuery } from "../providers/fintraffic/statistics-client.js";
import {
  splitStatisticsRange,
  StatisticsImportService,
} from "./statistics-import-service.js";

describe("splitStatisticsRange", () => {
  it("keeps hourly requests in bounded monthly chunks", () => {
    expect(splitStatisticsRange("2026-01-01", "2026-03-05", "hour")).toEqual([
      { from: "2026-01-01", to: "2026-01-31" },
      { from: "2026-02-01", to: "2026-02-28" },
      { from: "2026-03-01", to: "2026-03-05" },
    ]);
  });

  it("keeps daily requests in bounded yearly chunks", () => {
    expect(splitStatisticsRange("2020-01-01", "2021-02-01", "day")).toEqual([
      { from: "2020-01-01", to: "2020-12-31" },
      { from: "2021-01-01", to: "2021-02-01" },
    ]);
  });

  it("uses stable calendar boundaries for partial rolling windows", () => {
    expect(splitStatisticsRange("2025-09-01", "2026-08-31", "day")).toEqual([
      { from: "2025-09-01", to: "2025-12-31" },
      { from: "2026-01-01", to: "2026-08-31" },
    ]);
  });
});

describe("StatisticsImportService", () => {
  it("persists each completed direction and skips it on a rerun", async () => {
    const completed = new Set<number>();
    const repository = {
      isChunkComplete: vi.fn(async (chunk: { direction: number }) =>
        completed.has(chunk.direction),
      ),
      upsertVolumes: vi.fn(
        async (_assetId: string, rows: unknown[]) => rows.length,
      ),
      upsertSpeeds: vi.fn(
        async (_assetId: string, rows: unknown[]) => rows.length,
      ),
      markChunkComplete: vi.fn(async (chunk: { direction: number }) => {
        completed.add(chunk.direction);
      }),
    };
    const getReport = vi.fn(async (query: StatisticsReportQuery) =>
      query.metric === "volume"
        ? `pvm;suunta;Kaikki\n20260801;${query.direction};100\n`
        : `pvm;suunta;Kaikki;keskinopeus_Kaikki\n20260801;${query.direction};98;82.4\n`,
    );
    const service = new StatisticsImportService(
      {
        listStations: vi
          .fn()
          .mockResolvedValue([{ id: "station-a", tmsNumber: 20002 }]),
      },
      repository,
      { getReport },
    );
    const input = {
      coverageAreaId: "helsinki",
      tmsNumber: 20002,
      resolution: "day" as const,
      from: "2026-08-01",
      to: "2026-08-01",
    };

    await expect(service.importRange(input)).resolves.toMatchObject({
      completedChunkCount: 2,
      skippedChunkCount: 0,
      volumeRowCount: 2,
      speedRowCount: 2,
    });
    await expect(service.importRange(input)).resolves.toMatchObject({
      completedChunkCount: 0,
      skippedChunkCount: 2,
      volumeRowCount: 0,
      speedRowCount: 0,
    });
    expect(getReport).toHaveBeenCalledTimes(4);
    expect(repository.markChunkComplete).toHaveBeenCalledTimes(2);
  });
});
