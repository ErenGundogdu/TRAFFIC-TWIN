import type { TrafficEvent } from "@traffic-twin/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultTrafficEventFilters } from "../model/traffic-event-filters";
import { TrafficEventExplorer } from "./traffic-event-explorer";

const event: TrafficEvent = {
  id: "event-1",
  providerEventId: "1",
  category: "ROAD_WORK",
  status: "ACTIVE",
  severity: "HIGH",
  title: "Tie 1, Espoo. Tietyö.",
  description: "Turunväylä",
  comment: null,
  effects: ["Nopeusrajoitus"],
  direction: "BOTH",
  directionDescription: null,
  sender: "Fintraffic",
  language: "fi",
  geometry: { type: "Point", coordinates: [24.7, 60.2] },
  roadNumbers: [1],
  releaseTime: "2026-09-14T07:00:00.000Z",
  versionTime: "2026-09-14T07:30:00.000Z",
  startsAt: "2026-09-14T06:00:00.000Z",
  endsAt: null,
};

describe("TrafficEventExplorer", () => {
  it("opens the catalog, changes filters and selects a map event", () => {
    const onFiltersChange = vi.fn();
    const onSelectEvent = vi.fn();

    render(
      <TrafficEventExplorer
        events={[event]}
        allEvents={[
          event,
          { ...event, id: "event-2" },
          { ...event, id: "event-3" },
          { ...event, id: "event-4" },
        ]}
        filters={defaultTrafficEventFilters}
        onFiltersChange={onFiltersChange}
        selectedEventId={null}
        onSelectEvent={onSelectEvent}
        timeZone="Europe/Helsinki"
        status="ready"
        onRetry={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Yol olayları/ }));
    fireEvent.change(screen.getByLabelText("Durum"), {
      target: { value: "active" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Tie 1, Espoo\. Tietyö\./ }),
    );

    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByText("4 yol çalışması")).toBeInTheDocument();
    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultTrafficEventFilters,
      status: "active",
    });
    expect(onSelectEvent).toHaveBeenCalledWith("event-1");
  });
});
