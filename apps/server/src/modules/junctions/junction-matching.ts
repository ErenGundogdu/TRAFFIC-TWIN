import type {
  JunctionCoverage,
  JunctionMatchConfidence,
} from "@traffic-twin/contracts";

import type { PersistedStation } from "../asset-catalog/station-catalog-repository.js";
import type { OsmJunctionCandidate } from "../providers/openstreetmap/normalize-junctions.js";

export const JUNCTION_MATCH_POLICY = {
  version: "osm-road-ref-distance-bearing-v1",
  maxDistanceMeters: 1_500,
  closeDistanceMeters: 250,
  highConfidenceDistanceMeters: 750,
  maxBearingDifferenceDegrees: 45,
  highConfidenceBearingDifferenceDegrees: 25,
} as const;

export interface DerivedJunction {
  id: string;
  coverageAreaId: string;
  osmRelationId: string;
  name: string;
  longitude: number;
  latitude: number;
  roadRefs: string[];
  coverage: JunctionCoverage;
  policyVersion: string;
  sourceUpdatedAt: Date;
  sourceFetchedAt: Date;
  matches: Array<{
    stationAssetId: string;
    roadRef: string;
    distanceMeters: number;
    bearingDifferenceDegrees: number | null;
    confidence: JunctionMatchConfidence;
  }>;
}

export function inferFintrafficRoadRef(stationName: string) {
  return /^(?:vt|kt|st)(\d+)_/i.exec(stationName)?.[1] ?? null;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
) {
  const earthRadius = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDegrees(
  from: { longitude: number; latitude: number },
  to: { longitude: number; latitude: number },
) {
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function axisBearingDifference(a: number, b: number) {
  const directionalDifference = Math.abs(((a - b + 540) % 360) - 180);
  return Math.min(directionalDifference, 180 - directionalDifference);
}

export function deriveJunctions(
  coverageAreaId: string,
  candidates: OsmJunctionCandidate[],
  stations: PersistedStation[],
  fetchedAt: Date,
): DerivedJunction[] {
  const proposed = candidates.map((candidate) => {
    const roadRefs = new Set(candidate.roadRefs);
    const matches = stations.flatMap((station) => {
      const roadRef = inferFintrafficRoadRef(station.name);
      if (!roadRef || !roadRefs.has(roadRef)) return [];

      const distance = distanceMeters(station, candidate);
      if (distance > JUNCTION_MATCH_POLICY.maxDistanceMeters) return [];

      const bearingDifference =
        station.bearing === null
          ? null
          : axisBearingDifference(
              station.bearing,
              bearingDegrees(station, candidate),
            );
      if (
        distance > JUNCTION_MATCH_POLICY.closeDistanceMeters &&
        bearingDifference !== null &&
        bearingDifference > JUNCTION_MATCH_POLICY.maxBearingDifferenceDegrees
      ) {
        return [];
      }

      const confidence: JunctionMatchConfidence =
        distance <= JUNCTION_MATCH_POLICY.closeDistanceMeters ||
        (distance <= JUNCTION_MATCH_POLICY.highConfidenceDistanceMeters &&
          (bearingDifference === null ||
            bearingDifference <=
              JUNCTION_MATCH_POLICY.highConfidenceBearingDifferenceDegrees))
          ? "HIGH"
          : "MEDIUM";

      return [
        {
          stationAssetId: station.id,
          roadRef,
          distanceMeters: Math.round(distance),
          bearingDifferenceDegrees:
            bearingDifference === null ? null : Math.round(bearingDifference),
          confidence,
        },
      ];
    });

    return { candidate, matches };
  });
  const closestJunctionByStation = new Map<
    string,
    { osmRelationId: string; distanceMeters: number }
  >();

  for (const { candidate, matches } of proposed) {
    for (const match of matches) {
      const current = closestJunctionByStation.get(match.stationAssetId);
      if (!current || match.distanceMeters < current.distanceMeters) {
        closestJunctionByStation.set(match.stationAssetId, {
          osmRelationId: candidate.osmRelationId,
          distanceMeters: match.distanceMeters,
        });
      }
    }
  }

  return proposed.flatMap(({ candidate, matches: proposedMatches }) => {
    const matches = proposedMatches.filter(
      (match) =>
        closestJunctionByStation.get(match.stationAssetId)?.osmRelationId ===
        candidate.osmRelationId,
    );

    if (matches.length === 0) return [];

    const matchedRoadRefs = new Set(matches.map((match) => match.roadRef));
    const coversKnownRoads = candidate.roadRefs.every((roadRef) =>
      matchedRoadRefs.has(roadRef),
    );
    const coverage: JunctionCoverage =
      matches.length >= 2 && coversKnownRoads
        ? "FULL"
        : matches.length >= 2
          ? "PARTIAL"
          : "INSUFFICIENT";

    return [
      {
        id: `openstreetmap:junction:${candidate.osmRelationId}`,
        coverageAreaId,
        osmRelationId: candidate.osmRelationId,
        name: candidate.name,
        longitude: candidate.longitude,
        latitude: candidate.latitude,
        roadRefs: candidate.roadRefs,
        coverage,
        policyVersion: JUNCTION_MATCH_POLICY.version,
        sourceUpdatedAt: new Date(candidate.sourceUpdatedAt),
        sourceFetchedAt: fetchedAt,
        matches,
      },
    ];
  });
}
