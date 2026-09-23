import type {
  StationSummary,
  TrafficFlowStatus,
} from "@traffic-twin/contracts";

export const stationFreshnessFilters = [
  "FRESH",
  "STALE",
  "OUTDATED",
  "UNAVAILABLE",
] as const;

export const stationTrafficStateFilters = [
  "FLOWING",
  "SLOW",
  "CONGESTED",
  "INSUFFICIENT_DATA",
] as const;

export type StationFreshnessFilter = (typeof stationFreshnessFilters)[number];
export type StationTrafficStateFilter =
  (typeof stationTrafficStateFilters)[number];

export interface MapLayerSettings {
  stations: boolean;
  junctions: boolean;
  anomalies: boolean;
  roadWorks: boolean;
  trafficAnnouncements: boolean;
  fieldReports: boolean;
  freshness: StationFreshnessFilter[];
  trafficStates: StationTrafficStateFilter[];
}

export const defaultMapLayerSettings: MapLayerSettings = {
  stations: true,
  junctions: false,
  anomalies: false,
  roadWorks: false,
  trafficAnnouncements: false,
  fieldReports: false,
  freshness: [...stationFreshnessFilters],
  trafficStates: [...stationTrafficStateFilters],
};

export function filterStationsForMap(
  stations: StationSummary[],
  settings: MapLayerSettings,
  selectedStationId: string | null,
) {
  if (!settings.stations) return [];

  return stations.filter(
    (station) =>
      station.id === selectedStationId ||
      (settings.freshness.includes(station.freshness) &&
        settings.trafficStates.includes(classifyStationTraffic(station))),
  );
}

export function classifyStationTraffic(
  station: Pick<StationSummary, "directions">,
): StationTrafficStateFilter {
  const statuses = station.directions.map(
    (direction) => direction.trafficFlow.status,
  );

  if (hasAnyStatus(statuses, ["STATIONARY", "QUEUING"])) {
    return "CONGESTED";
  }
  if (statuses.includes("SLOW")) return "SLOW";
  if (hasAnyStatus(statuses, ["FREE_FLOW", "PLATOONING"])) return "FLOWING";
  return "INSUFFICIENT_DATA";
}

function hasAnyStatus(
  statuses: TrafficFlowStatus[],
  expected: TrafficFlowStatus[],
) {
  return statuses.some((status) => expected.includes(status));
}
