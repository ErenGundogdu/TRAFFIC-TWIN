import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import {
  ApplicationError,
  type ApplicationErrorKind,
} from "../common/errors/application-error.js";
import { sendApiError } from "../common/http/send-api-error.js";

const HTTP_STATUS_BY_ERROR_KIND = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UPSTREAM_UNAVAILABLE: 502,
} as const satisfies Record<ApplicationErrorKind, number>;

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  void _next;

  if (error instanceof ApplicationError) {
    if (error.kind === "UPSTREAM_UNAVAILABLE") {
      console.error(`${error.name}: ${error.message}`, {
        ...error.logContext,
        cause: error.cause,
      });
    }
    sendApiError(response, {
      status: HTTP_STATUS_BY_ERROR_KIND[error.kind],
      code: error.code,
      message: error.publicMessage,
    });
    return;
  }

  if (error instanceof ZodError) {
    sendApiError(response, {
      status: 400,
      code: "INVALID_REQUEST",
      message: "İstek doğrulanamadı.",
      details: error.issues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path.map((segment) =>
          typeof segment === "symbol"
            ? (segment.description ?? "symbol")
            : segment,
        ),
      })),
    });
    return;
  }

  console.error(error);
  sendApiError(response, {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "Beklenmeyen bir sunucu hatası oluştu.",
  });
};
