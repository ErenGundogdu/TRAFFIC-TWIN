import { z } from "zod";

export const apiValidationIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  path: z.array(z.union([z.string(), z.number()])),
});

export const apiErrorDescriptorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.array(apiValidationIssueSchema).optional(),
});

export const apiErrorResponseSchema = z.object({
  error: apiErrorDescriptorSchema.extend({
    requestId: z.string().min(1),
    timestamp: z.iso.datetime(),
  }),
});

export type ApiValidationIssue = z.infer<typeof apiValidationIssueSchema>;
export type ApiErrorDescriptor = z.infer<typeof apiErrorDescriptorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
