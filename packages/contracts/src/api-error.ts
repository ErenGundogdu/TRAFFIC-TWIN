import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "COVERAGE_AREA_NOT_FOUND",
  "FIELD_REPORT_COVERAGE_NOT_FOUND",
  "FIELD_REPORT_OUTSIDE_COVERAGE",
  "FIELD_REPORTS_UNAVAILABLE",
  "FINTRAFFIC_UNAVAILABLE",
  "HISTORY_IMPORT_JOB_CONFLICT",
  "HISTORY_IMPORT_JOB_NOT_FOUND",
  "HISTORY_IMPORT_NOTHING_TO_DO",
  "HISTORY_SCOPE_NOT_FOUND",
  "INTERNAL_SERVER_ERROR",
  "INVALID_FIELD_REPORT",
  "INVALID_OPERATOR_NOTE",
  "INVALID_REPLAY",
  "INVALID_REQUEST",
  "OPENSTREETMAP_UNAVAILABLE",
  "ROAD_CONTEXT_SCOPE_NOT_FOUND",
  "TRAFFIC_ASSET_NOT_FOUND",
  "TRAFFIC_EVENT_CONTEXT_SCOPE_NOT_FOUND",
]);

export const clientErrorCodeSchema = z.enum([
  "ACK_TIMEOUT",
  "HTTP_REQUEST_FAILED",
  "INVALID_ACK",
  "INVALID_API_RESPONSE",
  "REALTIME_DISCONNECTED",
]);

export const errorCodeSchema = z.union([
  apiErrorCodeSchema,
  clientErrorCodeSchema,
]);

export const apiValidationIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.array(z.union([z.string(), z.number()])),
});

export const apiErrorDescriptorSchema = z.object({
  code: errorCodeSchema,
  message: z.string().min(1),
  details: z.array(apiValidationIssueSchema).optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorDescriptorSchema.extend({
    code: apiErrorCodeSchema,
    requestId: z.string().min(1),
    timestamp: z.iso.datetime(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ClientErrorCode = z.infer<typeof clientErrorCodeSchema>;
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiValidationIssue = z.infer<typeof apiValidationIssueSchema>;
export type ApiErrorDescriptor = z.infer<typeof apiErrorDescriptorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
