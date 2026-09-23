import type { StatisticsResolution } from "../providers/fintraffic/parse-statistics-report.js";

export function resolveStatisticsRollingWindow(
  resolution: StatisticsResolution,
  timeZone: string,
  now: Date = new Date(),
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const years = resolution === "day" ? 5 : 2;

  // The current local month is deliberately excluded until it closes.
  const from = new Date(Date.UTC(year, month - 1 - years * 12, 1));
  const to = new Date(Date.UTC(year, month - 1, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}
