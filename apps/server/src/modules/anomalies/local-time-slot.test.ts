import { describe, expect, it } from "vitest";

import { getLocalTimeSlot } from "./local-time-slot.js";

describe("getLocalTimeSlot", () => {
  it("uses the coverage timezone instead of the server timezone", () => {
    expect(
      getLocalTimeSlot(new Date("2026-03-29T00:30:00.000Z"), "Europe/Helsinki"),
    ).toEqual({ weekday: 7, hour: 2 });
  });
});
