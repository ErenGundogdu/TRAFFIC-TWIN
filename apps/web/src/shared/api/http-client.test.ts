import { AxiosError, type AxiosAdapter } from "axios";
import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { httpClient } from "./http-client";

function failingAdapter(data: unknown, status: number): AxiosAdapter {
  return async (config) => {
    throw new AxiosError(
      "Request failed",
      "ERR_BAD_RESPONSE",
      config,
      undefined,
      {
        config,
        data,
        headers: {},
        status,
        statusText: "Bad Request",
      },
    );
  };
}

describe("httpClient error normalization", () => {
  it("preserves the typed server error context", async () => {
    const requestId = "93ba033f-e730-4a5e-8956-b3be63f7b475";

    await expect(
      httpClient.get("/invalid-request", {
        adapter: failingAdapter(
          {
            error: {
              code: "INVALID_REQUEST",
              message: "İstek doğrulanamadı.",
              requestId,
              timestamp: "2026-09-16T08:00:00.000Z",
              details: [
                {
                  code: "too_small",
                  message: "Too small",
                  path: ["assetId"],
                },
              ],
            },
          },
          400,
        ),
      }),
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      details: [
        {
          code: "too_small",
          message: "Too small",
          path: ["assetId"],
        },
      ],
      requestId,
      status: 400,
    } satisfies Partial<ApiError>);
  });

  it("uses a safe fallback for an unknown error body", async () => {
    await expect(
      httpClient.get("/unknown-error", {
        adapter: failingAdapter("gateway response", 502),
      }),
    ).rejects.toMatchObject({
      code: "HTTP_REQUEST_FAILED",
      requestId: null,
      status: 502,
    } satisfies Partial<ApiError>);
  });
});
