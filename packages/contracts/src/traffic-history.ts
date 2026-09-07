import { z } from "zod";

export const historyMetricSchema = z.enum([
  "average-speed-kmh",
  "vehicle-count",
]);
export const historyResolutionSchema = z.enum([
  "auto",
  "minute",
  "hour",
  "day",
]);
export const resolvedHistoryResolutionSchema = historyResolutionSchema.exclude([
  "auto",
]);

export const historyQuerySchema = z
  .object({
    assetIds: z.array(z.string().min(1)).min(1).max(2),
    metric: historyMetricSchema,
    direction: z.union([z.literal(1), z.literal(2)]),
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    resolution: historyResolutionSchema.default("auto"),
  })
  .refine((query) => new Date(query.from) < new Date(query.to), {
    message: "Başlangıç zamanı bitişten önce olmalıdır.",
    path: ["to"],
  })
  .refine(
    (query) =>
      new Date(query.to).getTime() - new Date(query.from).getTime() <=
      370 * 86_400_000,
    { message: "En fazla 370 günlük aralık sorgulanabilir.", path: ["to"] },
  )
  .refine((query) => new Set(query.assetIds).size === query.assetIds.length, {
    message: "Aynı varlık iki kez seçilemez.",
    path: ["assetIds"],
  });

export const historyPointSchema = z.object({
  timestamp: z.iso.datetime(),
  value: z.number().nonnegative(),
  sampleCount: z.number().int().nonnegative(),
});

export const historySeriesSchema = z.object({
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  points: z.array(historyPointSchema),
});

export const ingestionCoverageSchema = z.object({
  status: z.enum(["COMPLETE", "PARTIAL", "NO_DATA"]),
  requestedDays: z.number().int().positive(),
  availableDays: z.number().int().nonnegative(),
  missingDates: z.array(z.iso.date()),
});

export const historyResponseSchema = z.object({
  query: historyQuerySchema,
  resolution: resolvedHistoryResolutionSchema,
  timeZone: z.string().min(1),
  coverage: ingestionCoverageSchema,
  series: z.array(historySeriesSchema),
});

export const historyAssetAvailabilitySchema = z.object({
  assetId: z.string().min(1),
  firstDate: z.iso.date(),
  lastDate: z.iso.date(),
  availableDayCount: z.number().int().positive(),
  availableDates: z.array(z.iso.date()).min(1),
});

export const historyAvailabilityResponseSchema = z.object({
  coverageAreaId: z.string().min(1),
  timeZone: z.string().min(1),
  assets: z.array(historyAssetAvailabilitySchema),
});

export type HistoryMetric = z.infer<typeof historyMetricSchema>;
export type HistoryResolution = z.infer<typeof historyResolutionSchema>;
export type ResolvedHistoryResolution = z.infer<
  typeof resolvedHistoryResolutionSchema
>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
export type HistoryPoint = z.infer<typeof historyPointSchema>;
export type HistorySeries = z.infer<typeof historySeriesSchema>;
export type IngestionCoverage = z.infer<typeof ingestionCoverageSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type HistoryAssetAvailability = z.infer<
  typeof historyAssetAvailabilitySchema
>;
export type HistoryAvailabilityResponse = z.infer<
  typeof historyAvailabilityResponseSchema
>;
