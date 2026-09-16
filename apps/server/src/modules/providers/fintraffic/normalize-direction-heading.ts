import type {
  TrafficDirection,
  TrafficDirectionHeading,
} from "@traffic-twin/contracts";

const COMPASS_POINTS: TrafficDirectionHeading["compassPoint"][] = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
];

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

export function normalizeDirectionHeading(
  providerBearing: number | null,
  direction: TrafficDirection["direction"],
): TrafficDirectionHeading | null {
  if (providerBearing === null) return null;

  // Fintraffic bearing follows the road-register ascending direction (SUUNTA1).
  const degrees = normalizeDegrees(
    direction === 1 ? providerBearing : providerBearing + 180,
  );
  const compassPoint = COMPASS_POINTS[Math.round(degrees / 45) % 8];
  if (!compassPoint) {
    throw new RangeError(`Heading ${degrees} could not be classified.`);
  }

  return {
    degrees,
    compassPoint,
    determination: direction === 1 ? "PROVIDER_REPORTED" : "DERIVED_OPPOSITE",
  };
}
