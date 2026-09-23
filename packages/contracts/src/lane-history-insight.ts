import { z } from "zod";

export const laneBaselineStateSchema = z.enum([
  "LOW",
  "EXPECTED",
  "HIGH",
  "INSUFFICIENT_DATA",
]);

export const laneMetricBaselineSchema = z.object({
  currentValue: z.number().nonnegative().nullable(),
  expectedMedian: z.number().nonnegative().nullable(),
  expectedLowerBound: z.number().nonnegative().nullable(),
  expectedUpperBound: z.number().nonnegative().nullable(),
  state: laneBaselineStateSchema,
  sampleCount: z.number().int().nonnegative(),
});

export const laneHistoryEvaluationSchema = z.object({
  lane: z.number().int().positive(),
  direction: z.union([z.literal(1), z.literal(2)]),
  measuredAt: z.iso.datetime(),
  speed: laneMetricBaselineSchema,
  flow: laneMetricBaselineSchema,
});

export const laneHistoryInsightResponseSchema = z.object({
  assetId: z.string().min(1),
  generatedAt: z.iso.datetime(),
  timeZone: z.string().min(1),
  localWeekday: z.number().int().min(1).max(7),
  localHour: z.number().int().min(0).max(23),
  baselineStart: z.iso.datetime(),
  baselineEnd: z.iso.datetime(),
  baselineWindowWeeks: z.number().int().positive(),
  minimumSamples: z.number().int().positive(),
  policyVersion: z.literal("lane-hourly-median-mad-v1"),
  evaluations: z.array(laneHistoryEvaluationSchema),
});

export type LaneBaselineState = z.infer<typeof laneBaselineStateSchema>;
export type LaneMetricBaseline = z.infer<typeof laneMetricBaselineSchema>;
export type LaneHistoryEvaluation = z.infer<typeof laneHistoryEvaluationSchema>;
export type LaneHistoryInsightResponse = z.infer<
  typeof laneHistoryInsightResponseSchema
>;
