import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "./create-app.js";
import { parseEnv } from "../config/env.js";

describe("GET /health", () => {
  it("reports that the HTTP application is healthy", async () => {
    const response = await request(
      createApp(parseEnv({ NODE_ENV: "test" })),
    ).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
