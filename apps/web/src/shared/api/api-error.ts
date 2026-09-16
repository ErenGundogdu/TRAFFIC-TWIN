import type { ApiValidationIssue } from "@traffic-twin/contracts";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number | null,
    readonly requestId: string | null = null,
    readonly timestamp: string | null = null,
    readonly details: ApiValidationIssue[] | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
