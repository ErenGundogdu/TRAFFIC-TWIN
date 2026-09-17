import { z } from "zod";

import { historyImportPlanQuerySchema } from "./history-import-plan.js";

export const createHistoryImportJobSchema = historyImportPlanQuerySchema;

export const historyImportJobStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "PARTIAL_FAILURE",
  "FAILED",
]);

export const historyImportJobSchema = z.object({
  id: z.uuid(),
  coverageAreaId: z.string().min(1),
  asset: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    tmsNumber: z.number().int().positive(),
  }),
  range: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    requestedDayCount: z.number().int().positive(),
    targetDayCount: z.number().int().positive(),
  }),
  progress: z.object({
    completedDayCount: z.number().int().nonnegative(),
    successfulDayCount: z.number().int().nonnegative(),
    failedDayCount: z.number().int().nonnegative(),
    skippedDayCount: z.number().int().nonnegative(),
    currentSourceDate: z.iso.date().nullable(),
  }),
  status: historyImportJobStatusSchema,
  createdAt: z.iso.datetime(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});

export const historyImportJobResponseSchema = z.object({
  job: historyImportJobSchema,
});

export type CreateHistoryImportJob = z.infer<
  typeof createHistoryImportJobSchema
>;
export type HistoryImportJobStatus = z.infer<
  typeof historyImportJobStatusSchema
>;
export type HistoryImportJob = z.infer<typeof historyImportJobSchema>;
export type HistoryImportJobResponse = z.infer<
  typeof historyImportJobResponseSchema
>;
