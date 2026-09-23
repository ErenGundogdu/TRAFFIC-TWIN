import type { ResolvedHistoryResolution } from "@traffic-twin/contracts";

export interface HistoryResolutionPolicy {
  minuteRetentionDays: number;
  hourRetentionDays: number;
  dayRetentionDays: number;
}

const DAY_MS = 86_400_000;

export function resolveHistoryResolutions(
  sourceDate: string,
  currentLocalDate: string,
  policy: HistoryResolutionPolicy,
): ResolvedHistoryResolution[] {
  const ageDays = Math.floor(
    (Date.parse(`${currentLocalDate}T00:00:00Z`) -
      Date.parse(`${sourceDate}T00:00:00Z`)) /
      DAY_MS,
  );

  if (ageDays <= policy.minuteRetentionDays) {
    return ["minute", "hour", "day"];
  }
  if (ageDays <= policy.hourRetentionDays) return ["hour", "day"];
  if (ageDays <= policy.dayRetentionDays) return ["day"];
  return [];
}

export function formatDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
