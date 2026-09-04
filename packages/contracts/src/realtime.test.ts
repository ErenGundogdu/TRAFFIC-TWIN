import { describe, expect, it } from "vitest";

import { createOperatorNoteSchema, trafficBatchSchema } from "./realtime.js";

describe("realtime contracts", () => {
  it("trims and validates an operator note", () => {
    expect(
      createOperatorNoteSchema.parse({
        assetId: "fintraffic-tms:20002",
        author: "  Eren  ",
        content: "  Şerit kontrol edildi.  ",
      }),
    ).toEqual({
      assetId: "fintraffic-tms:20002",
      author: "Eren",
      content: "Şerit kontrol edildi.",
    });

    expect(
      createOperatorNoteSchema.safeParse({
        assetId: "fintraffic-tms:20002",
        author: "E",
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
});
