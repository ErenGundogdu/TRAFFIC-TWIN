import { describe, expect, it } from "vitest";

import {
  createOperatorNoteSchema,
  replayControlSchema,
  replayStartSchema,
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

  it("caps minute-resolution replay at two days but hour-resolution at thirty", () => {
    const base = {
      coverageAreaId: "helsinki",
      assetIds: ["fintraffic-tms:20002"],
      direction: 1 as const,
      speed: 8 as const,
    };

    expect(
      replayStartSchema.safeParse({
        ...base,
        resolution: "minute",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-03T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      replayStartSchema.safeParse({
        ...base,
        resolution: "minute",
        from: "2026-09-01T00:00:00.000Z",
        to: "2026-09-04T00:00:00.000Z",
      }).success,
    ).toBe(false);

    expect(
      replayStartSchema.safeParse({
        ...base,
        resolution: "hour",
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-31T00:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      replayStartSchema.safeParse({
        ...base,
        resolution: "hour",
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-09-02T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
