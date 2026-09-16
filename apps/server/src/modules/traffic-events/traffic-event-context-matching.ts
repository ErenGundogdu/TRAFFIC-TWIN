import type {
  TrafficEventContextMatch,
  TrafficEvent,
} from "@traffic-twin/contracts";

import type { TrafficEventContextCandidate } from "./traffic-event-context-repository.js";

export const TRAFFIC_EVENT_CONTEXT_POLICY = {
  version: "station-event-context-v1",
  nearbyMaxDistanceMeters: 1_000,
  sameRoadMaxDistanceMeters: 5_000,
  maximumResults: 8,
} as const;

const statusRank: Record<TrafficEvent["status"], number> = {
  ACTIVE: 0,
  UPCOMING: 1,
  ENDED: 2,
};

const severityRank: Record<TrafficEvent["severity"], number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
  UNKNOWN: 3,
};

export function matchTrafficEventContext(
  candidates: TrafficEventContextCandidate[],
  stationRoadRef: string | null,
  policy = TRAFFIC_EVENT_CONTEXT_POLICY,
): TrafficEventContextMatch[] {
  return candidates
    .flatMap((candidate) => {
      const matchedRoadNumber = findMatchedRoadNumber(
        candidate.event.roadNumbers,
        stationRoadRef,
      );
      const roadMatch = matchedRoadNumber !== null;
      const maximumDistance = roadMatch
        ? policy.sameRoadMaxDistanceMeters
        : policy.nearbyMaxDistanceMeters;
      if (candidate.distanceMeters > maximumDistance) return [];

      return [
        {
          event: candidate.event,
          relation: roadMatch ? "SAME_ROAD_NEARBY" : "NEARBY",
          distanceMeters: Math.max(0, Math.round(candidate.distanceMeters)),
          roadMatch,
          matchedRoadNumber,
        } satisfies TrafficEventContextMatch,
      ];
    })
    .sort(compareMatches)
    .slice(0, policy.maximumResults);
}

function findMatchedRoadNumber(
  eventRoadNumbers: number[],
  stationRoadRef: string | null,
) {
  if (!stationRoadRef) return null;
  return (
    eventRoadNumbers.find(
      (roadNumber) => String(roadNumber) === stationRoadRef,
    ) ?? null
  );
}

function compareMatches(
  left: TrafficEventContextMatch,
  right: TrafficEventContextMatch,
) {
  if (left.roadMatch !== right.roadMatch) return left.roadMatch ? -1 : 1;
  if (left.distanceMeters !== right.distanceMeters) {
    return left.distanceMeters - right.distanceMeters;
  }
  if (left.event.status !== right.event.status) {
    return statusRank[left.event.status] - statusRank[right.event.status];
  }
  return severityRank[left.event.severity] - severityRank[right.event.severity];
}
