import type { TrafficEvent } from "@traffic-twin/contracts";

import type { TrafficEventFilters } from "../model/traffic-event-filters";

const categoryValues = {
  "road-work": "ROAD_WORK",
  "traffic-announcement": "TRAFFIC_ANNOUNCEMENT",
} as const;

export function filterTrafficEvents(
  events: TrafficEvent[],
  filters: TrafficEventFilters,
) {
  const query = normalizeSearchText(filters.query);

  return events.filter((event) => {
    if (event.status === "ENDED") return false;
    if (filters.category === "none") return false;
    if (
      filters.category !== "all" &&
      event.category !== categoryValues[filters.category]
    ) {
      return false;
    }
    if (
      filters.status !== "all" &&
      event.status !== filters.status.toUpperCase()
    ) {
      return false;
    }
    if (
      filters.severity !== "all" &&
      event.severity !== filters.severity.toUpperCase()
    ) {
      return false;
    }
    if (!query) return true;

    return normalizeSearchText(
      [
        event.title,
        event.description,
        event.comment,
        event.effects.join(" "),
        event.roadNumbers.join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    ).includes(query);
  });
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("fi-FI");
}
