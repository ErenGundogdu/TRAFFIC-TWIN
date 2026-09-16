import { describe, expect, it } from "vitest";

import {
  defaultTrafficEventFilters,
  parseTrafficEventFilters,
  setTrafficEventFilters,
} from "./traffic-event-filters";

describe("traffic event URL filters", () => {
  it("parses supported values and safely defaults invalid links", () => {
    expect(
      parseTrafficEventFilters(
        new URLSearchParams(
          "eventQuery=Tie+1&eventCategory=road-work&eventStatus=active&eventSeverity=high",
        ),
      ),
    ).toEqual({
      query: "Tie 1",
      category: "road-work",
      status: "active",
      severity: "high",
    });
    expect(
      parseTrafficEventFilters(
        new URLSearchParams("eventCategory=invalid&eventStatus=ended"),
      ),
    ).toEqual(defaultTrafficEventFilters);
  });

  it("removes defaults and a selection invalidated by filter changes", () => {
    const params = setTrafficEventFilters(
      new URLSearchParams("station=station-1&event=event-1"),
      { ...defaultTrafficEventFilters, status: "upcoming" },
    );

    expect(params.toString()).toBe("station=station-1&eventStatus=upcoming");
  });
});
