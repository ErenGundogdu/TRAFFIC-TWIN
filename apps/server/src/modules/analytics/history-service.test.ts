import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { HistoryService } from "./history-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki",
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

function stationRepository(): StationCatalogRepository {
  return {
    findCoverageArea: vi.fn(async () => coverageArea),
    listStations: vi.fn(async () => [station]),
    upsertStations: vi.fn(async () => undefined),
  };
}

describe("HistoryService", () => {
  it.each([
    ["2026-09-02T21:00:00Z", "2026-09-03T21:00:00Z", "minute"],
    ["2026-08-01T00:00:00Z", "2026-09-03T21:00:00Z", "hour"],
    ["2025-09-03T00:00:00Z", "2026-09-03T00:00:00Z", "day"],
  ] as const)(
    "selects the appropriate automatic resolution",
    async (from, to, expected) => {
      const getSeries = vi.fn(async () => []);
      const service = new HistoryService(stationRepository(), {
        getSeries,
        listAvailableDates: vi.fn(async () => []),
        listAvailability: vi.fn(async () => []),
      });

      const result = await service.query("helsinki", {
        assetIds: [station.id],
        metric: "average-speed-kmh",
        direction: 1,
        resolution: "auto",
        from,
        to,
      });

      expect(result.resolution).toBe(expected);
      expect(result.coverage.status).toBe("NO_DATA");
    },
  );

  it("reports missing imported dates instead of filling them", async () => {
    const service = new HistoryService(stationRepository(), {
      getSeries: vi.fn(async () => []),
      listAvailableDates: vi.fn(async () => [
        { assetId: station.id, sourceDate: "2026-09-03" },
      ]),
      listAvailability: vi.fn(async () => []),
    });

    const result = await service.query("helsinki", {
      assetIds: [station.id],
      metric: "vehicle-count",
      direction: 1,
      resolution: "day",
      from: "2026-09-01T21:00:00Z",
      to: "2026-09-03T21:00:00Z",
    });

    expect(result.coverage).toMatchObject({
      status: "PARTIAL",
      requestedDays: 2,
      availableDays: 1,
      missingDates: ["2026-09-02"],
    });
  });

  it("groups processed source dates into per-asset availability", async () => {
    const service = new HistoryService(stationRepository(), {
      getSeries: vi.fn(async () => []),
      listAvailableDates: vi.fn(async () => []),
      listAvailability: vi.fn(async () => [
        { assetId: station.id, sourceDate: "2026-08-29" },
        { assetId: station.id, sourceDate: "2026-09-03" },
        { assetId: station.id, sourceDate: "2026-09-03" },
      ]),
    });

    await expect(service.getAvailability("helsinki")).resolves.toEqual({
      coverageAreaId: "helsinki",
      timeZone: "Europe/Helsinki",
      assets: [
        {
          assetId: station.id,
          firstDate: "2026-08-29",
          lastDate: "2026-09-03",
          availableDayCount: 2,
          availableDates: ["2026-08-29", "2026-09-03"],
        },
      ],
    });
  });
});
