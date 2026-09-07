import type { StationSummary } from "@traffic-twin/contracts";

const FRESH_LIMIT_MS = 5 * 60 * 1_000;
const STALE_LIMIT_MS = 15 * 60 * 1_000;

export function classifyMeasurementFreshness(
  measuredAt: string | null | undefined,
  now: Date,
): StationSummary["freshness"] {
  if (!measuredAt) {
    return "UNAVAILABLE";
  }

  const ageMs = now.getTime() - new Date(measuredAt).getTime();
  if (ageMs <= FRESH_LIMIT_MS) {
    return "FRESH";
  }
  return ageMs <= STALE_LIMIT_MS ? "STALE" : "OUTDATED";
}
