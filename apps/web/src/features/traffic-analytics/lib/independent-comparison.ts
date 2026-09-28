import {
  HISTORY_MAXIMUM_RANGE_DAYS,
  historyMetricSchema,
  historyResolutionSchema,
  type HistoryQuery,
  type HistoryResponse,
  type StationCatalogResponse,
} from "@traffic-twin/contracts";
import { z } from "zod";

import { createInclusiveHistoryRange } from "./analytics-filters";

const sideSchema = z.object({
  assetId: z.string().min(1),
  direction: z.union([z.literal("1"), z.literal("2")]),
  period: z.enum(["live", "historical"]),
  fromDate: z.iso.date(),
  toDate: z.iso.date(),
  resolution: historyResolutionSchema,
});

export const independentComparisonSchema = z.object({
  metric: historyMetricSchema,
  a: sideSchema,
  b: sideSchema,
});

export type IndependentComparison = z.infer<typeof independentComparisonSchema>;
export type ComparisonSide = IndependentComparison["a"];

export function getComparisonConfigurationIssue(
  comparison: IndependentComparison,
) {
  if (
    comparison.metric === "vehicle-count" &&
    comparison.a.period !== comparison.b.period
  ) {
    return "Canlı akış araç/sa, geçmiş veri ise seçili dönemin toplam araç sayısıdır. Araç hacmini karşılaştırmak için iki tarafı da canlı veya iki tarafı da geçmiş seçin.";
  }
  return null;
}

export function readIndependentComparison(
  params: URLSearchParams,
  catalog: StationCatalogResponse,
  selectedStationId: string,
  defaultDate: string,
): IndependentComparison {
  const stationIds = new Set(catalog.stations.map((station) => station.id));
  function side(
    prefix: "cmpA" | "cmpB",
    fallbackAssetId: string,
    fallbackPeriod: "live" | "historical",
  ): ComparisonSide {
    const assetId = params.get(`${prefix}Asset`);
    const fromDate = params.get(`${prefix}From`);
    const toDate = params.get(`${prefix}To`);
    const from = z.iso.date().safeParse(fromDate);
    const to = z.iso.date().safeParse(toDate);
    const resolution = historyResolutionSchema.safeParse(
      params.get(`${prefix}Resolution`),
    );
    const direction = z
      .enum(["1", "2"])
      .safeParse(params.get(`${prefix}Direction`));
    const period = z
      .enum(["live", "historical"])
      .safeParse(params.get(`${prefix}Period`));
    const candidate: ComparisonSide = {
      assetId: assetId && stationIds.has(assetId) ? assetId : fallbackAssetId,
      direction: direction.success ? direction.data : "1",
      period: period.success ? period.data : fallbackPeriod,
      fromDate: from.success ? from.data : defaultDate,
      toDate:
        to.success && from.success && to.data >= from.data
          ? to.data
          : from.success
            ? from.data
            : defaultDate,
      resolution: resolution.success ? resolution.data : "auto",
    };
    return isComparisonHistoryRangeValid(candidate)
      ? candidate
      : {
          ...candidate,
          fromDate: defaultDate,
          toDate: defaultDate,
        };
  }
  const metric = historyMetricSchema.safeParse(params.get("cmpMetric"));
  return {
    metric: metric.success ? metric.data : "average-speed-kmh",
    a: side("cmpA", selectedStationId, "live"),
    b: side("cmpB", selectedStationId, "historical"),
  };
}

export function createComparisonHistoryQuery(
  side: ComparisonSide,
  metric: IndependentComparison["metric"],
  timeZone: string,
): HistoryQuery {
  const range = createInclusiveHistoryRange(
    side.fromDate,
    side.toDate,
    timeZone,
  );
  return {
    assetIds: [side.assetId],
    direction: Number(side.direction) as 1 | 2,
    metric,
    resolution: side.resolution,
    ...range,
  };
}

export function isComparisonHistoryRangeValid(side: ComparisonSide) {
  if (side.period === "live") return true;
  const days =
    (Date.parse(`${side.toDate}T00:00:00Z`) -
      Date.parse(`${side.fromDate}T00:00:00Z`)) /
      86_400_000 +
    1;
  return (
    Number.isFinite(days) &&
    days > 0 &&
    days <= HISTORY_MAXIMUM_RANGE_DAYS[side.resolution]
  );
}

export interface ComparisonReading {
  value: number | null;
  unit: "km/sa" | "araç/sa" | "araç";
  measuredAt: string | null;
  source: "CANLI" | "GEÇMİŞ";
  status: "READY" | "STALE" | "NO_DATA";
  resolution: HistoryResponse["resolution"] | null;
  requestedDays: number | null;
  coverage: HistoryResponse["coverage"]["status"] | null;
}

export function createComparisonReading(
  side: ComparisonSide,
  metric: IndependentComparison["metric"],
  catalog: StationCatalogResponse,
  history: HistoryResponse | undefined,
  now = new Date(),
): ComparisonReading {
  if (side.period === "live") {
    const station = catalog.stations.find((item) => item.id === side.assetId);
    const direction = station?.directions.find(
      (item) => String(item.direction) === side.direction,
    );
    const value =
      metric === "average-speed-kmh"
        ? direction?.averageSpeedKmh
        : direction?.flowVehiclesPerHour;
    const measurementAge = direction?.measuredAt
      ? now.getTime() - Date.parse(direction.measuredAt)
      : Number.POSITIVE_INFINITY;
    return {
      value: value ?? null,
      unit: metric === "average-speed-kmh" ? "km/sa" : "araç/sa",
      measuredAt: direction?.measuredAt ?? null,
      source: "CANLI",
      status:
        station?.freshness === "FRESH" &&
        value != null &&
        measurementAge >= -60_000 &&
        measurementAge <= 300_000
          ? "READY"
          : value != null
            ? "STALE"
            : "NO_DATA",
      resolution: null,
      requestedDays: null,
      coverage: null,
    };
  }
  const summary = history?.summaries[0];
  const value =
    metric === "average-speed-kmh"
      ? summary?.averageSpeedKmh
      : summary?.bucketCount
        ? summary.totalVehicleCount
        : null;
  return {
    value: value ?? null,
    unit: metric === "average-speed-kmh" ? "km/sa" : "araç",
    measuredAt: null,
    source: "GEÇMİŞ",
    status: value != null ? "READY" : "NO_DATA",
    resolution: history?.resolution ?? null,
    requestedDays: history?.coverage.requestedDays ?? null,
    coverage: history?.coverage.status ?? null,
  };
}

export function compareReadings(a: ComparisonReading, b: ComparisonReading) {
  if (a.value === null || b.value === null)
    return { difference: null, reason: "Taraflardan birinde ölçüm yok." };
  if (a.status !== "READY" || b.status !== "READY")
    return {
      difference: null,
      reason: "Canlı ölçüm güncel değil; fark hesaplanmadı.",
    };
  if (a.unit !== b.unit)
    return {
      difference: null,
      reason:
        "Canlı geçiş oranı (araç/sa) ile tarihsel toplam (araç) aynı büyüklük değildir.",
    };
  if (a.source !== b.source)
    return {
      difference: null,
      contextualDifference: a.value - b.value,
      reason:
        "Bu yalnız bağlamsal hız farkıdır: canlı değer kayan 5 dakikalık pencere, geçmiş değer seçili dönem özetidir. Eşdeğer dönem karşılaştırması değildir.",
    };
  if (a.source === "CANLI") {
    if (
      !a.measuredAt ||
      !b.measuredAt ||
      Math.abs(Date.parse(a.measuredAt) - Date.parse(b.measuredAt)) > 600_000
    ) {
      return {
        difference: null,
        reason: "Canlı ölçümlerin zamanları 10 dakikadan fazla ayrılıyor.",
      };
    }
  } else if (
    a.coverage !== "COMPLETE" ||
    b.coverage !== "COMPLETE" ||
    a.requestedDays !== b.requestedDays ||
    a.resolution !== b.resolution
  ) {
    return {
      difference: null,
      reason:
        "Geçmiş dönemlerin kapsamı, süresi ve çözünürlüğü eşit ve eksiksiz olmalı.",
    };
  }
  return {
    difference: a.value - b.value,
    reason: "Karşılaştırılabilir iki gerçek ölçüm.",
  };
}
