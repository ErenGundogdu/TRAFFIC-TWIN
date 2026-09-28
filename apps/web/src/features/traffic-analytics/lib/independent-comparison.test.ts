import { describe, expect, it } from "vitest";

import {
  compareReadings,
  createComparisonHistoryQuery,
  createComparisonReading,
  getComparisonConfigurationIssue,
  isComparisonHistoryRangeValid,
  readIndependentComparison,
  type ComparisonReading,
} from "./independent-comparison";

const live = (
  value: number,
  measuredAt = "2026-09-22T09:00:00.000Z",
): ComparisonReading => ({
  value,
  unit: "km/sa",
  measuredAt,
  source: "CANLI",
  status: "READY",
  resolution: null,
  requestedDays: null,
  coverage: null,
});

const historical = (value: number, days = 1): ComparisonReading => ({
  value,
  unit: "km/sa",
  measuredAt: null,
  source: "GEÇMİŞ",
  status: "READY",
  resolution: "day",
  requestedDays: days,
  coverage: "COMPLETE",
});

describe("independent comparison", () => {
  it("compares two fresh live stations only when measurement times are close", () => {
    expect(
      compareReadings(live(90), live(80, "2026-09-22T09:05:00.000Z"))
        .difference,
    ).toBe(10);
    expect(
      compareReadings(live(90), live(80, "2026-09-22T08:45:00.000Z"))
        .difference,
    ).toBeNull();
  });

  it("shows live versus historical as context without a misleading delta", () => {
    expect(compareReadings(live(90), historical(80)).difference).toBeNull();
    expect(compareReadings(live(90), historical(80)).contextualDifference).toBe(
      10,
    );
    expect(compareReadings(live(90), historical(80)).reason).toContain(
      "5 dakikalık",
    );
  });

  it("compares equal complete historical periods and rejects unequal ones", () => {
    expect(
      compareReadings(historical(90, 7), historical(80, 7)).difference,
    ).toBe(10);
    expect(
      compareReadings(historical(90, 7), historical(80, 1)).difference,
    ).toBeNull();
  });

  it("does not equate live flow rate with historical vehicle total", () => {
    expect(
      compareReadings(
        { ...live(100), unit: "araç/sa" },
        { ...historical(300), unit: "araç" },
      ).difference,
    ).toBeNull();
  });

  it("rejects a live-to-historical vehicle volume configuration", () => {
    const issue = getComparisonConfigurationIssue({
      metric: "vehicle-count",
      a: {
        assetId: "a",
        direction: "1",
        period: "live",
        fromDate: "2026-09-24",
        toDate: "2026-09-24",
        resolution: "auto",
      },
      b: {
        assetId: "a",
        direction: "2",
        period: "historical",
        fromDate: "2026-09-24",
        toDate: "2026-09-24",
        resolution: "day",
      },
    });

    expect(issue).toContain("araç/sa");
    expect(issue).toContain("toplam araç");
  });

  it("keeps each historical period independent", () => {
    const first = createComparisonHistoryQuery(
      {
        assetId: "a",
        direction: "1",
        period: "historical",
        fromDate: "2026-09-01",
        toDate: "2026-09-01",
        resolution: "day",
      },
      "average-speed-kmh",
      "Europe/Helsinki",
    );
    const second = createComparisonHistoryQuery(
      {
        assetId: "a",
        direction: "1",
        period: "historical",
        fromDate: "2026-09-15",
        toDate: "2026-09-15",
        resolution: "day",
      },
      "average-speed-kmh",
      "Europe/Helsinki",
    );
    expect(first.from).not.toBe(second.from);
    expect(first.assetIds).toEqual(second.assetIds);
  });

  it("falls back from unknown station IDs in shared links", () => {
    const catalog = {
      coverageArea: {
        id: "test",
        name: "Test",
        timeZone: "Europe/Helsinki",
        bbox: [0, 0, 1, 1] as [number, number, number, number],
      },
      source: {
        id: "fintraffic-tms" as const,
        name: "Fintraffic Digitraffic TMS" as const,
        attribution: "source",
        licenseUrl: "https://example.com",
        status: "AVAILABLE" as const,
        updatedAt: null,
        fetchedAt: "2026-09-22T00:00:00.000Z",
      },
      stations: [{ id: "a" }],
    };
    const result = readIndependentComparison(
      new URLSearchParams("cmpBAsset=unknown&cmpBPeriod=historical"),
      catalog as Parameters<typeof readIndependentComparison>[1],
      "a",
      "2026-09-21",
    );
    expect(result.b.assetId).toBe("a");
    expect(result.b.period).toBe("historical");
  });

  it("rejects an oversized historical URL range before querying", () => {
    const side = {
      assetId: "a",
      direction: "1" as const,
      period: "historical" as const,
      fromDate: "2026-08-01",
      toDate: "2026-09-01",
      resolution: "minute" as const,
    };
    expect(isComparisonHistoryRangeValid(side)).toBe(false);
  });

  it("checks the selected direction timestamp, not just station freshness", () => {
    const catalog = {
      stations: [
        {
          id: "a",
          freshness: "FRESH",
          directions: [
            {
              direction: 1,
              averageSpeedKmh: 90,
              flowVehiclesPerHour: 200,
              measuredAt: "2026-09-22T08:40:00.000Z",
            },
          ],
        },
      ],
    } as Parameters<typeof createComparisonReading>[2];
    const reading = createComparisonReading(
      {
        assetId: "a",
        direction: "1",
        period: "live",
        fromDate: "2026-09-21",
        toDate: "2026-09-21",
        resolution: "auto",
      },
      "average-speed-kmh",
      catalog,
      undefined,
      new Date("2026-09-22T09:00:00.000Z"),
    );
    expect(reading.status).toBe("STALE");
  });
});
