import { randomUUID } from "node:crypto";

import type { RequestHandler, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";

export const attachRequestId: RequestHandler = (_request, response, next) => {
  response.setHeader(REQUEST_ID_HEADER, randomUUID());
  next();
};

export function getRequestId(response: Response): string {
  const value = response.getHeader(REQUEST_ID_HEADER);
  return typeof value === "string" ? value : randomUUID();
}
