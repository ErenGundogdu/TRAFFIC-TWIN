import type { AxiosAdapter } from "axios";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiClient } from "./api-client";
import { ApiError } from "./api-error";

function responseAdapter(data: unknown): AxiosAdapter {
  return async (config) => ({
    config,
    data,
    headers: {},
    status: 200,
    statusText: "OK",
  });
}

describe("apiClient", () => {
  it("returns data validated by the supplied response schema", async () => {
    const schema = z.object({ id: z.string(), count: z.number().int() });

    await expect(
      apiClient.get("/typed-resource", schema, {
        adapter: responseAdapter({ id: "station-1", count: 2 }),
      }),
    ).resolves.toEqual({ id: "station-1", count: 2 });
  });

  it("normalizes an invalid success payload as an API contract error", async () => {
    const schema = z.object({ id: z.string() });

    await expect(
      apiClient.get("/invalid-resource", schema, {
        adapter: responseAdapter({ id: 42 }),
      }),
    ).rejects.toMatchObject({
      code: "INVALID_API_RESPONSE",
      status: 200,
    } satisfies Partial<ApiError>);
  });

  it("posts a typed command and validates the canonical response", async () => {
    const schema = z.object({ id: z.string(), status: z.literal("QUEUED") });

    await expect(
      apiClient.post(
        "/typed-resource",
        { from: "2026-09-01", to: "2026-09-02" },
        schema,
        {
          adapter: responseAdapter({ id: "job-1", status: "QUEUED" }),
        },
      ),
    ).resolves.toEqual({ id: "job-1", status: "QUEUED" });
  });
});
