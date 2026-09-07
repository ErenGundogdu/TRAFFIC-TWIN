import type { RoadSegment } from "@traffic-twin/contracts";

import { distanceMeters } from "../../junctions/junction-matching.js";
import type { OverpassRoadResponse } from "./schemas.js";

const MAX_SEGMENTS = 4;
const MAX_COORDINATES_EACH_SIDE = 16;

function normalizedRefs(tags: Record<string, string> | undefined) {
  return [tags?.ref, tags?.int_ref]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(";"))
    .map((value) => value.replace(/^E\s*/i, "").trim());
}

function bearingDegrees(
  from: readonly [number, number],
  to: readonly [number, number],
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const fromLatitude = toRadians(from[1]);
  const toLatitude = toRadians(to[1]);
  const longitudeDelta = toRadians(to[0] - from[0]);
  const y = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const x =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function directionalDifference(left: number, right: number) {
  return Math.abs(((left - right + 540) % 360) - 180);
}

export interface RoadContextCandidate extends RoadSegment {
  sourceUpdatedAt: string;
}

export function normalizeRoadContext(
  payload: OverpassRoadResponse,
  station: {
    longitude: number;
    latitude: number;
    bearing: number | null;
  },
  roadRef: string | null,
): RoadContextCandidate[] {
  const stationPoint = {
    longitude: station.longitude,
    latitude: station.latitude,
  };

  return payload.elements
    .flatMap((element) => {
      if (
        element.type !== "way" ||
        !element.tags?.highway ||
        !element.geometry ||
        element.geometry.length < 2
      ) {
        return [];
      }

      const refs = normalizedRefs(element.tags);
      if (roadRef && !refs.includes(roadRef)) return [];

      const coordinates = element.geometry.map(
        (point) => [point.lon, point.lat] as [number, number],
      );
      const distances = coordinates.map((coordinate) =>
        distanceMeters(stationPoint, {
          longitude: coordinate[0],
          latitude: coordinate[1],
        }),
      );
      const nearestIndex = distances.indexOf(Math.min(...distances));
      const start = Math.max(0, nearestIndex - MAX_COORDINATES_EACH_SIDE);
      const end = Math.min(
        coordinates.length,
        nearestIndex + MAX_COORDINATES_EACH_SIDE + 1,
      );
      const nearbyCoordinates = coordinates.slice(start, end);
      const wayBearing = bearingDegrees(
        nearbyCoordinates[0]!,
        nearbyCoordinates.at(-1)!,
      );
      const direction: 1 | 2 | null =
        station.bearing === null || element.tags.oneway !== "yes"
          ? null
          : directionalDifference(wayBearing, station.bearing) <= 90
            ? 1
            : 2;

      return [
        {
          id: `openstreetmap:way:${element.id}`,
          osmWayId: String(element.id),
          name: element.tags.name ?? null,
          roadRef: refs[0] ?? null,
          highwayClass: element.tags.highway,
          direction,
          distanceMeters: Math.round(distances[nearestIndex]!),
          coordinates: nearbyCoordinates,
          sourceUpdatedAt: payload.osm3s.timestamp_osm_base,
        },
      ];
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, MAX_SEGMENTS);
}
