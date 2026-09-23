import type {
  StationSummary,
  TrafficFlowStatus,
} from "@traffic-twin/contracts";

export interface LiveTrafficOverview {
  totalStations: number;
  freshStations: number;
  flowingStations: number;
  slowStations: number;
  congestedStations: number;
  insufficientStations: number;
}

type OverviewGroup =
  | "flowingStations"
  | "slowStations"
  | "congestedStations"
  | "insufficientStations";

function classifyStation(statuses: TrafficFlowStatus[]): OverviewGroup {
  if (
    statuses.some((status) => status === "STATIONARY" || status === "QUEUING")
  ) {
    return "congestedStations";
  }
  if (statuses.includes("SLOW")) {
    return "slowStations";
  }
  if (
    statuses.some((status) => status === "FREE_FLOW" || status === "PLATOONING")
  ) {
    return "flowingStations";
  }
  return "insufficientStations";
}

export function createLiveTrafficOverview(
  stations: StationSummary[],
): LiveTrafficOverview {
  const overview: LiveTrafficOverview = {
    totalStations: stations.length,
    freshStations: 0,
    flowingStations: 0,
    slowStations: 0,
    congestedStations: 0,
    insufficientStations: 0,
  };

  for (const station of stations) {
    if (station.freshness === "FRESH") overview.freshStations += 1;
    const group = classifyStation(
      station.directions.map((direction) => direction.trafficFlow.status),
    );
    overview[group] += 1;
  }

  return overview;
}
