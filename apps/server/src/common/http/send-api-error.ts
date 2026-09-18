import type {
  ApiErrorCode,
  ApiErrorResponse,
  ApiValidationIssue,
} from "@traffic-twin/contracts";
import type { Response } from "express";

import { getRequestId } from "./request-id.js";

interface ApiErrorInput {
  code: ApiErrorCode;
  details?: ApiValidationIssue[];
  message: string;
  status: number;
}

export function sendApiError(response: Response, input: ApiErrorInput): void {
  const payload: ApiErrorResponse = {
    error: {
      code: input.code,
      message: input.message,
      requestId: getRequestId(response),
      timestamp: new Date().toISOString(),
      ...(input.details ? { details: input.details } : {}),
    },
  };

  response.status(input.status).json(payload);
}
