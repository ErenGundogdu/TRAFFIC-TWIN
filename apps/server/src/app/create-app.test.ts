import { apiErrorResponseSchema } from "@traffic-twin/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./create-app.js";
import { parseEnv } from "../config/env.js";
import { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";

describe("GET /health", () => {
  it("reports that the HTTP application is healthy", async () => {
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" })),
    ).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
  });
});

describe("API error boundary", () => {
  it("returns one typed and traceable validation error shape", async () => {
    const operatorNoteService = new OperatorNoteService({
      create: async () => {
        throw new Error("Not used in this test.");
      },
      listForAsset: async () => [],
    });
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" }), { operatorNoteService }),
    ).get("/api/operator-notes?assetId=%20");
    const body = apiErrorResponseSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "INVALID_REQUEST",
        message: "İstek doğrulanamadı.",
        requestId: response.headers["x-request-id"],
        details: [
          {
            code: "too_small",
            path: ["assetId"],
          },
        ],
      },
    });
    expect(Date.parse(body.error.timestamp)).not.toBeNaN();
  });
});
