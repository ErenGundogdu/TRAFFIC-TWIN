import { describe, expect, it } from "vitest";

import {
  formatTrafficEventDate,
  formatTrafficEventDirection,
  formatTrafficEventSeverity,
} from "./traffic-event-formatters";

describe("traffic event formatters", () => {
  it("presents provider direction without inventing a destination", () => {
    expect(formatTrafficEventDirection("BOTH", null)).toBe("Her iki yön");
    expect(formatTrafficEventDirection("NEGATIVE", "Helsinki")).toBe(
      "Azalan yol numarası yönü · Kaynak hedefi: Helsinki",
    );
    expect(formatTrafficEventDirection("UNKNOWN", null)).toBe(
      "Yön bilgisi sağlanmadı",
    );
  });

  it("keeps missing severity explicit", () => {
    expect(formatTrafficEventSeverity("UNKNOWN")).toBe("Sağlanmadı");
  });

  it("formats UTC values in the coverage time zone", () => {
    expect(
      formatTrafficEventDate("2026-09-14T21:00:00.000Z", "Europe/Helsinki"),
    ).toContain("15 Eyl 2026");
  });
});
