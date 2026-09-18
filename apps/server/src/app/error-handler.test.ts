import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "../common/errors/application-error.js";
import { errorHandler } from "./error-handler.js";

function createThrowingApp(error: unknown) {
  const app = express();
  app.get("/failure", (_request, _response, next) => next(error));
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    {
      kind: "BAD_REQUEST" as const,
      code: "FIELD_REPORT_OUTSIDE_COVERAGE" as const,
      expectedStatus: 400,
    },
    {
      kind: "NOT_FOUND" as const,
      code: "COVERAGE_AREA_NOT_FOUND" as const,
      expectedStatus: 404,
    },
    {
      kind: "CONFLICT" as const,
      code: "HISTORY_IMPORT_JOB_CONFLICT" as const,
      expectedStatus: 409,
    },
    {
      kind: "UPSTREAM_UNAVAILABLE" as const,
      code: "FINTRAFFIC_UNAVAILABLE" as const,
      expectedStatus: 502,
    },
  ])(
    "maps $kind without knowing a domain error subclass",
    async ({ kind, code, expectedStatus }) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const response = await request(
        createThrowingApp(
          new ApplicationError("internal diagnostic", {
            kind,
            code,
            publicMessage: "Güvenli kullanıcı mesajı.",
            logContext: { upstreamStatus: 503 },
          }),
        ),
      ).get("/failure");

      expect(response.status).toBe(expectedStatus);
      expect(response.body).toMatchObject({
        error: {
          code,
          message: "Güvenli kullanıcı mesajı.",
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
      expect(JSON.stringify(response.body)).not.toContain(
        "internal diagnostic",
      );
    },
  );

  it("hides an unknown error behind the canonical internal error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await request(
      createThrowingApp(new Error("database password leaked")),
    ).get("/failure");

    expect(response.status).toBe(500);
    expect(response.body.error).toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Beklenmeyen bir sunucu hatası oluştu.",
    });
    expect(JSON.stringify(response.body)).not.toContain("database password");
  });
});
