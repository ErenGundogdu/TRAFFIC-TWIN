import { z } from "zod";

export const anomalyMetricSchema = z.enum([
  "average-speed-kmh",
  "flow-vehicles-per-hour",
]);
export const anomalyStatusSchema = z.enum([
  "INSUFFICIENT_DATA",
  "NORMAL",
  "CANDIDATE",
  "ACTIVE",
]);
export const anomalyConfidenceSchema = z.enum([
  "INSUFFICIENT",
  "LOW",
  "MEDIUM",
  "HIGH",
]);

export const anomalyEvaluationSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  direction: z.union([z.literal(1), z.literal(2)]),
  metric: anomalyMetricSchema,
  status: anomalyStatusSchema,
  confidence: anomalyConfidenceSchema,
  observedAt: z.iso.datetime(),
  currentValue: z.number().nonnegative(),
  expectedMedian: z.number().nonnegative().nullable(),
  expectedLowerBound: z.number().nonnegative().nullable(),
  expectedUpperBound: z.number().nonnegative().nullable(),
  absoluteDeviation: z.number().nonnegative().nullable(),
  sampleCount: z.number().int().nonnegative(),
  consecutiveDeviations: z.number().int().nonnegative(),
  minimumSamples: z.number().int().positive(),
  requiredConsecutiveDeviations: z.number().int().positive(),
  policyVersion: z.string().min(1),
  baselineWindowWeeks: z.number().int().positive(),
  baselineStart: z.iso.datetime(),
  baselineEnd: z.iso.datetime(),
  localTimeZone: z.string().min(1),
  localWeekday: z.number().int().min(1).max(7),
  localHour: z.number().int().min(0).max(23),
});

export const anomalyCatalogResponseSchema = z.object({
  coverageAreaId: z.string().min(1),
  generatedAt: z.iso.datetime(),
  evaluations: z.array(anomalyEvaluationSchema),
});

export type AnomalyMetric = z.infer<typeof anomalyMetricSchema>;
export type AnomalyStatus = z.infer<typeof anomalyStatusSchema>;
export type AnomalyConfidence = z.infer<typeof anomalyConfidenceSchema>;
export type AnomalyEvaluation = z.infer<typeof anomalyEvaluationSchema>;
export type AnomalyCatalogResponse = z.infer<
  typeof anomalyCatalogResponseSchema
>;
