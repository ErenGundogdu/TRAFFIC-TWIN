import type { Request } from "express";
import { z } from "zod";

export const identifierSchema = z.string().trim().min(1).max(200);

export const coverageAreaParamsSchema = z.object({
  coverageAreaId: identifierSchema,
});

export function parseRequestParams<TOutput>(
  request: Pick<Request, "params">,
  schema: z.ZodType<TOutput>,
): TOutput {
  return schema.parse(request.params);
}

export function parseRequestQuery<TOutput>(
  request: Pick<Request, "query">,
  schema: z.ZodType<TOutput>,
): TOutput {
  return schema.parse(request.query);
}

export function parseRequestBody<TOutput>(
  request: Pick<Request, "body">,
  schema: z.ZodType<TOutput>,
): TOutput {
  return schema.parse(request.body);
}
