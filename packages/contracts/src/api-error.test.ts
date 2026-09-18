import { describe, expect, it } from "vitest";

import {
  apiErrorCodeSchema,
  apiErrorResponseSchema,
  errorCodeSchema,
} from "./api-error.js";

describe("API error contract", () => {
  it("validates a traceable validation error", () => {
    expect(
      apiErrorResponseSchema.parse({
        error: {
          code: "INVALID_REQUEST",
          message: "İstek doğrulanamadı.",
          requestId: "93ba033f-e730-4a5e-8956-b3be63f7b475",
          timestamp: "2026-09-16T08:00:00.000Z",
          details: [
            {
              code: "too_small",
              message: "Too small",
              path: ["assetId"],
            },
          ],
        },
      }).error.code,
    ).toBe("INVALID_REQUEST");
  });

  it("rejects untraceable REST errors", () => {
    expect(
      apiErrorResponseSchema.safeParse({
        error: { code: "INVALID_REQUEST", message: "Invalid" },
      }).success,
    ).toBe(false);
  });

  it("rejects error codes outside the shared public contract", () => {
    expect(errorCodeSchema.safeParse("UNREGISTERED_ERROR").success).toBe(false);
    expect(apiErrorCodeSchema.safeParse("REALTIME_DISCONNECTED").success).toBe(
      false,
    );
  });
});
