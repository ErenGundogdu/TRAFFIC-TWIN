import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import { HistoryImportPlanningService } from "./history-import-planning-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki metropol bölgesi",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

const station = {
  id: "fintraffic-tms:20002",
  providerStationId: 20002,
  tmsNumber: 20002,
  name: "vt1_Espoo_Hirvisuo",
  longitude: 24.637997,
  latitude: 60.220898,
  bearing: 298,
};

describe("HistoryImportPlanningService", () => {
  it("classifies every requested day from the persisted artifact manifest", async () => {
    const listArtifactsForAssetDateRange = vi.fn(async () => [
      {
        id: "artifact-available",
        sourceDate: "2026-09-01",
        status: "PROCESSED" as const,
        recordCount: 100,
        validRecordCount: 98,
        errorMessage: null,
        updatedAt: new Date("2026-09-02T08:00:00Z"),
      },
      {
        id: "artifact-failed",
        sourceDate: "2026-09-03",
        status: "FAILED" as const,
        recordCount: 0,
        validRecordCount: 0,
        errorMessage: "Upstream file was unavailable.",
        updatedAt: new Date("2026-09-03T08:00:00Z"),
      },
      {
        id: "artifact-empty",
        sourceDate: "2026-09-04",
        status: "PROCESSED" as const,
        recordCount: 12,
        validRecordCount: 0,
        errorMessage: null,
        updatedAt: new Date("2026-09-04T08:00:00Z"),
      },
      {
        id: "artifact-downloaded",
        sourceDate: "2026-09-05",
        status: "DOWNLOADED" as const,
        recordCount: 0,
        validRecordCount: 0,
        errorMessage: null,
        updatedAt: new Date("2026-09-05T08:00:00Z"),
      },
    ]);
    const service = new HistoryImportPlanningService(
      {
        findCoverageArea: vi.fn(async () => coverageArea),
        listStations: vi.fn(async () => [station]),
      },
      { listArtifactsForAssetDateRange },
      () => new Date("2026-09-06T12:00:00Z"),
    );

    const result = await service.createPlan("helsinki", {
      assetId: station.id,
      from: "2026-09-01",
      to: "2026-09-05",
    });

    expect(listArtifactsForAssetDateRange).toHaveBeenCalledWith(
      station.id,
      "2026-09-01",
      "2026-09-05",
    );
    expect(result.summary).toEqual({
      availableDayCount: 1,
      missingDayCount: 1,
      failedDayCount: 1,
      pendingProcessingDayCount: 1,
      noValidDataDayCount: 1,
      notYetAvailableDayCount: 0,
    });
    expect(
      result.days.map(({ sourceDate, status }) => ({ sourceDate, status })),
    ).toEqual([
      { sourceDate: "2026-09-01", status: "AVAILABLE" },
      { sourceDate: "2026-09-02", status: "MISSING" },
      { sourceDate: "2026-09-03", status: "FAILED" },
      { sourceDate: "2026-09-04", status: "NO_VALID_DATA" },
      { sourceDate: "2026-09-05", status: "PENDING_PROCESSING" },
    ]);
    expect(result.days[1]).toMatchObject({
      artifactId: null,
      recordCount: null,
      validRecordCount: null,
      updatedAt: null,
      errorMessage: null,
    });
  });

  it("keeps current and future local dates out of the importable backlog", async () => {
    const service = new HistoryImportPlanningService(
      {
        findCoverageArea: vi.fn(async () => coverageArea),
        listStations: vi.fn(async () => [station]),
      },
      { listArtifactsForAssetDateRange: vi.fn(async () => []) },
      () => new Date("2026-09-06T21:30:00Z"),
    );

    const result = await service.createPlan("helsinki", {
      assetId: station.id,
      from: "2026-09-06",
      to: "2026-09-08",
    });

    expect(result.days.map((day) => day.status)).toEqual([
      "MISSING",
      "NOT_YET_AVAILABLE",
      "NOT_YET_AVAILABLE",
    ]);
    expect(result.summary.notYetAvailableDayCount).toBe(2);
  });

  it("rejects a station outside the requested coverage area", async () => {
    const service = new HistoryImportPlanningService(
      {
        findCoverageArea: vi.fn(async () => coverageArea),
        listStations: vi.fn(async () => []),
      },
      { listArtifactsForAssetDateRange: vi.fn() },
    );

    await expect(
      service.createPlan("helsinki", {
        assetId: station.id,
        from: "2026-09-01",
        to: "2026-09-01",
      }),
    ).rejects.toThrow("outside coverage area");
  });
});
