import { describe, expect, it } from "vitest";

import {
  createOperatorNoteSchema,
  replayControlSchema,
  trafficBatchSchema,
} from "./realtime.js";

describe("realtime contracts", () => {
  it("trims and validates an operator note", () => {
    expect(
      createOperatorNoteSchema.parse({
        assetId: "fintraffic-tms:20002",
        author: "  Eren  ",
        category: "MAINTENANCE",
        status: "RESOLVED",
        content: "  Şerit kontrol edildi.  ",
      }),
    ).toEqual({
      assetId: "fintraffic-tms:20002",
      author: "Eren",
      category: "MAINTENANCE",
      status: "RESOLVED",
      content: "Şerit kontrol edildi.",
    });

    expect(
      createOperatorNoteSchema.safeParse({
        assetId: "fintraffic-tms:20002",
        author: "E",
        category: "FAULT",
        status: "ACTION_REQUIRED",
        content: "",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid live batch at the shared boundary", () => {
    expect(
      trafficBatchSchema.safeParse({
        coverageAreaId: "helsinki",
        sourceUpdatedAt: "not-a-date",
        emittedAt: "2026-09-04T09:01:01Z",
        stations: [],
      }).success,
    ).toBe(false);
  });

  it("validates replay seek timestamps", () => {
    expect(
      replayControlSchema.parse({
        action: "seek",
        timestamp: "2026-09-03T08:25:00.000Z",
      }),
    ).toEqual({
      action: "seek",
      timestamp: "2026-09-03T08:25:00.000Z",
    });
    expect(
      replayControlSchema.safeParse({ action: "seek", timestamp: "08:25" })
        .success,
    ).toBe(false);
  });
});
