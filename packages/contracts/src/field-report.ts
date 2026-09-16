import { z } from "zod";

import { apiErrorDescriptorSchema } from "./api-error.js";

export const fieldReportCategorySchema = z.enum([
  "ACCIDENT",
  "CONGESTION",
  "ROAD_HAZARD",
  "ROAD_DAMAGE",
  "SIGNAL_FAILURE",
  "SENSOR_ISSUE",
  "OTHER",
]);

export const fieldReportSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const fieldReportStatusSchema = z.enum([
  "PENDING_REVIEW",
  "VERIFIED",
  "REJECTED",
  "RESOLVED",
]);

export const fieldReportLocationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

export const createFieldReportSchema = z.object({
  coverageAreaId: z.string().min(1),
  author: z.string().trim().min(2).max(80),
  category: fieldReportCategorySchema,
  severity: fieldReportSeveritySchema,
  description: z.string().trim().min(3).max(1_000),
  location: fieldReportLocationSchema,
});

export const fieldReportSchema = createFieldReportSchema.extend({
  id: z.uuid(),
  source: z.literal("OPERATOR"),
  status: fieldReportStatusSchema,
  observedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

export const fieldReportListSchema = z.object({
  reports: z.array(fieldReportSchema),
});

export const fieldReportAcknowledgementSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), report: fieldReportSchema }),
  z.object({
    ok: z.literal(false),
    error: apiErrorDescriptorSchema,
  }),
]);

export type CreateFieldReport = z.infer<typeof createFieldReportSchema>;
export type FieldReport = z.infer<typeof fieldReportSchema>;
export type FieldReportAcknowledgement = z.infer<
  typeof fieldReportAcknowledgementSchema
>;
export type FieldReportCategory = z.infer<typeof fieldReportCategorySchema>;
export type FieldReportLocation = z.infer<typeof fieldReportLocationSchema>;
export type FieldReportSeverity = z.infer<typeof fieldReportSeveritySchema>;
export type FieldReportStatus = z.infer<typeof fieldReportStatusSchema>;
