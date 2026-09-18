import type { ApiErrorCode } from "@traffic-twin/contracts";

export type ApplicationErrorKind =
  "BAD_REQUEST" | "NOT_FOUND" | "CONFLICT" | "UPSTREAM_UNAVAILABLE";

interface ApplicationErrorOptions extends ErrorOptions {
  code: ApiErrorCode;
  kind: ApplicationErrorKind;
  publicMessage: string;
  logContext?: Readonly<Record<string, unknown>>;
}

export class ApplicationError extends Error {
  readonly code: ApiErrorCode;
  readonly kind: ApplicationErrorKind;
  readonly publicMessage: string;
  readonly logContext: Readonly<Record<string, unknown>> | null;

  constructor(message: string, options: ApplicationErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = options.code;
    this.kind = options.kind;
    this.publicMessage = options.publicMessage;
    this.logContext = options.logContext ?? null;
  }
}
