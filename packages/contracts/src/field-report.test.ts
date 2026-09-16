import { describe, expect, it } from "vitest";

import { createFieldReportSchema, fieldReportSchema } from "./field-report.js";

describe("field report contracts", () => {
  it("trims and validates an operator-created report", () => {
    expect(
      createFieldReportSchema.parse({
        coverageAreaId: "helsinki",
        author: "  Eren  ",
        category: "ACCIDENT",
        severity: "HIGH",
        description: "  Sağ şerit kapalı.  ",
        location: { longitude: 24.94, latitude: 60.17 },
      }),
    ).toEqual({
      coverageAreaId: "helsinki",
      author: "Eren",
      category: "ACCIDENT",
      severity: "HIGH",
      description: "Sağ şerit kapalı.",
      location: { longitude: 24.94, latitude: 60.17 },
    });
  });

  it("does not accept a client-supplied canonical status", () => {
    const input = createFieldReportSchema.parse({
      coverageAreaId: "helsinki",
      author: "Eren",
      category: "CONGESTION",
      severity: "MEDIUM",
      description: "Trafik yavaş ilerliyor.",
      location: { longitude: 24.94, latitude: 60.17 },
      status: "VERIFIED",
    });

    expect(input).not.toHaveProperty("status");
    expect(
      fieldReportSchema.safeParse({
        ...input,
        id: "087b305a-829a-48fa-a94a-3394d59ca68a",
        source: "OPERATOR",
        status: "PENDING_REVIEW",
        observedAt: "2026-09-15T08:00:00.000Z",
        createdAt: "2026-09-15T08:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});
