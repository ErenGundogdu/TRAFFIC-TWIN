import { z } from "zod";

const DAY_MS = 86_400_000;

export const historyImportPlanQuerySchema = z
  .object({
    assetId: z.string().trim().min(1).max(200),
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((query) => query.from <= query.to, {
    message: "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
    path: ["to"],
  })
  .refine(
    (query) =>
      Date.parse(`${query.to}T00:00:00Z`) -
        Date.parse(`${query.from}T00:00:00Z`) <=
      369 * DAY_MS,
    {
      message: "Tek planda en fazla 370 takvim günü istenebilir.",
      path: ["to"],
    },
  );

export const historyImportDayStatusSchema = z.enum([
  "AVAILABLE",
  "MISSING",
  "FAILED",
  "PENDING_PROCESSING",
  "NO_VALID_DATA",
]);

export const historyImportPlanDaySchema = z.object({
  sourceDate: z.iso.date(),
  status: historyImportDayStatusSchema,
  artifactId: z.string().min(1).nullable(),
  recordCount: z.number().int().nonnegative().nullable(),
  validRecordCount: z.number().int().nonnegative().nullable(),
  updatedAt: z.iso.datetime().nullable(),
  errorMessage: z.string().min(1).nullable(),
});

export const historyImportPlanResponseSchema = z.object({
  coverageAreaId: z.string().min(1),
  timeZone: z.string().min(1),
  asset: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    tmsNumber: z.number().int().positive(),
  }),
  range: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    requestedDayCount: z.number().int().positive(),
  }),
  summary: z.object({
    availableDayCount: z.number().int().nonnegative(),
    missingDayCount: z.number().int().nonnegative(),
    failedDayCount: z.number().int().nonnegative(),
    pendingProcessingDayCount: z.number().int().nonnegative(),
    noValidDataDayCount: z.number().int().nonnegative(),
  }),
  days: z.array(historyImportPlanDaySchema).min(1),
});

export type HistoryImportPlanQuery = z.infer<
  typeof historyImportPlanQuerySchema
>;
export type HistoryImportDayStatus = z.infer<
  typeof historyImportDayStatusSchema
>;
export type HistoryImportPlanDay = z.infer<typeof historyImportPlanDaySchema>;
export type HistoryImportPlanResponse = z.infer<
  typeof historyImportPlanResponseSchema
>;
