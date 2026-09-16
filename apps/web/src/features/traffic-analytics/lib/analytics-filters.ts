import {
  historyMetricSchema,
  historyResolutionSchema,
  type HistoryMetric,
  type HistoryResolution,
} from "@traffic-twin/contracts";
import { z } from "zod";

import { shiftDateLabel, zonedDateStartIso } from "@/shared/time/zoned-date";

const dateSchema = z.iso.date({ error: "Geçerli bir tarih seçin." });
const MAXIMUM_INCLUSIVE_DAYS = 370;

export const analyticsFilterSchema = z
  .object({
    compareAssetId: z.string(),
    metric: historyMetricSchema,
    direction: z.union([z.literal("1"), z.literal("2")]),
    resolution: historyResolutionSchema,
    fromDate: dateSchema,
    toDate: dateSchema,
  })
  .refine((value) => value.fromDate <= value.toDate, {
    message: "Bitiş tarihi başlangıçtan önce olamaz.",
    path: ["toDate"],
  })
  .refine((value) => inclusiveDayCount(value.fromDate, value.toDate) <= 370, {
    message: "En fazla 370 günlük aralık seçilebilir.",
    path: ["toDate"],
  });

export type AnalyticsFilterValues = z.infer<typeof analyticsFilterSchema>;

interface SearchParamReader {
  get(name: string): string | null;
}

interface ParseAnalyticsUrlFiltersOptions {
  compareAssetId: string;
  defaultDate: string;
  comparisonWasIgnored?: boolean;
}

export function parseAnalyticsUrlFilters(
  searchParams: SearchParamReader,
  options: ParseAnalyticsUrlFiltersOptions,
) {
  const ignoredParameters: string[] = [];
  const metric = parseEnumParameter(
    searchParams.get("metric"),
    historyMetricSchema,
    "average-speed-kmh",
    "metric",
    ignoredParameters,
  );
  const resolution = parseEnumParameter(
    searchParams.get("resolution"),
    historyResolutionSchema,
    "auto",
    "resolution",
    ignoredParameters,
  );
  const direction = parseEnumParameter(
    searchParams.get("direction"),
    z.enum(["1", "2"]),
    "1",
    "direction",
    ignoredParameters,
  );
  let fromDate = parseDateParameter(
    searchParams.get("from"),
    options.defaultDate,
    "from",
    ignoredParameters,
  );
  let toDate = parseDateParameter(
    searchParams.get("to"),
    options.defaultDate,
    "to",
    ignoredParameters,
  );

  if (
    fromDate > toDate ||
    inclusiveDayCount(fromDate, toDate) > MAXIMUM_INCLUSIVE_DAYS
  ) {
    fromDate = options.defaultDate;
    toDate = options.defaultDate;
    ignoredParameters.push("from", "to");
  }

  if (options.comparisonWasIgnored) ignoredParameters.push("compare");

  return {
    values: {
      compareAssetId: options.compareAssetId,
      metric,
      direction,
      resolution,
      fromDate,
      toDate,
    } satisfies AnalyticsFilterValues,
    ignoredParameters: [...new Set(ignoredParameters)],
  };
}

export function createInclusiveHistoryRange(
  fromDate: string,
  toDate: string,
  timeZone: string,
) {
  return {
    from: zonedDateStartIso(fromDate, timeZone),
    to: zonedDateStartIso(shiftDateLabel(toDate, 1), timeZone),
  };
}

function parseDateParameter(
  rawValue: string | null,
  fallback: string,
  parameter: string,
  ignoredParameters: string[],
) {
  if (rawValue === null) return fallback;
  const result = dateSchema.safeParse(rawValue);
  if (result.success) return result.data;
  ignoredParameters.push(parameter);
  return fallback;
}

function parseEnumParameter<
  T extends HistoryMetric | HistoryResolution | "1" | "2",
>(
  rawValue: string | null,
  schema: z.ZodType<T>,
  fallback: T,
  parameter: string,
  ignoredParameters: string[],
) {
  if (rawValue === null) return fallback;
  const result = schema.safeParse(rawValue);
  if (result.success) return result.data;
  ignoredParameters.push(parameter);
  return fallback;
}

function inclusiveDayCount(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T12:00:00Z`).getTime();
  const to = new Date(`${toDate}T12:00:00Z`).getTime();
  return Math.floor((to - from) / 86_400_000) + 1;
}
