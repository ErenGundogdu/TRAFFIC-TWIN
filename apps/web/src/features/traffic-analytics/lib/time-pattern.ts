import type { HistoryResponse } from "@traffic-twin/contracts";

export interface TimePatternCell {
  dayIndex: number;
  hour: number;
  value: number;
  sampleCount: number;
  intensity: number;
}

export interface TimePattern {
  cells: TimePatternCell[];
  minimum: number;
  maximum: number;
  populatedCellCount: number;
}

const weekdayIndexes: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function createTimePattern(
  history: HistoryResponse,
): TimePattern | null {
  if (history.resolution === "day") return null;

  const primarySeries = history.series[0];
  if (!primarySeries || primarySeries.points.length === 0) return null;

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: history.timeZone,
  });
  const hourlyBuckets = new Map<
    string,
    {
      dayIndex: number;
      hour: number;
      weightedTotal: number;
      weight: number;
      pointCount: number;
    }
  >();

  for (const point of primarySeries.points) {
    const parts = formatter.formatToParts(new Date(point.timestamp));
    const weekday = parts.find((part) => part.type === "weekday")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const dayIndex = weekday ? weekdayIndexes[weekday] : undefined;
    if (
      dayIndex === undefined ||
      !Number.isInteger(hour) ||
      !year ||
      !month ||
      !day
    ) {
      continue;
    }

    const key = `${year}-${month}-${day}:${hour}`;
    const current = hourlyBuckets.get(key) ?? {
      dayIndex,
      hour,
      weightedTotal: 0,
      weight: 0,
      pointCount: 0,
    };
    const weight = Math.max(point.sampleCount, 1);
    current.weightedTotal +=
      history.query.metric === "vehicle-count"
        ? point.value
        : point.value * weight;
    current.weight += history.query.metric === "vehicle-count" ? 1 : weight;
    current.pointCount += 1;
    hourlyBuckets.set(key, current);
  }

  if (hourlyBuckets.size === 0) return null;

  const groups = new Map<
    string,
    { total: number; occurrenceCount: number; pointCount: number }
  >();
  for (const bucket of hourlyBuckets.values()) {
    const key = `${bucket.dayIndex}:${bucket.hour}`;
    const current = groups.get(key) ?? {
      total: 0,
      occurrenceCount: 0,
      pointCount: 0,
    };
    current.total +=
      history.query.metric === "vehicle-count"
        ? bucket.weightedTotal
        : bucket.weightedTotal / bucket.weight;
    current.occurrenceCount += 1;
    current.pointCount += bucket.pointCount;
    groups.set(key, current);
  }

  const values = [...groups.values()].map(
    (group) => group.total / group.occurrenceCount,
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const cells = [...groups.entries()].map(([key, group]) => {
    const [dayIndex, hour] = key.split(":").map(Number) as [number, number];
    const value = group.total / group.occurrenceCount;
    return {
      dayIndex,
      hour,
      value,
      sampleCount: group.pointCount,
      intensity: range === 0 ? 0.55 : (value - minimum) / range,
    };
  });

  return { cells, minimum, maximum, populatedCellCount: cells.length };
}

const dayNames = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

export interface BusiestSlot {
  label: string;
  value: number;
  sampleCount: number;
}

/**
 * Aggregates cells by hour-of-day (across all matched weekdays) and returns
 * the hour with the highest average value — "günün en yoğun saati".
 */
export function findBusiestHour(pattern: TimePattern): BusiestSlot | null {
  const byHour = new Map<
    number,
    { total: number; count: number; samples: number }
  >();
  for (const cell of pattern.cells) {
    const current = byHour.get(cell.hour) ?? { total: 0, count: 0, samples: 0 };
    current.total += cell.value;
    current.count += 1;
    current.samples += cell.sampleCount;
    byHour.set(cell.hour, current);
  }
  if (byHour.size === 0) return null;

  const [hour, best] = [...byHour.entries()].reduce((winner, entry) =>
    entry[1].total / entry[1].count > winner[1].total / winner[1].count
      ? entry
      : winner,
  );
  return {
    label: `${hour.toString().padStart(2, "0")}:00`,
    value: best.total / best.count,
    sampleCount: best.samples,
  };
}

/**
 * Aggregates cells by weekday (across all matched hours) and returns the
 * weekday with the highest average value — "haftanın en yoğun günü".
 */
export function findBusiestWeekday(pattern: TimePattern): BusiestSlot | null {
  const byDay = new Map<
    number,
    { total: number; count: number; samples: number }
  >();
  for (const cell of pattern.cells) {
    const current = byDay.get(cell.dayIndex) ?? {
      total: 0,
      count: 0,
      samples: 0,
    };
    current.total += cell.value;
    current.count += 1;
    current.samples += cell.sampleCount;
    byDay.set(cell.dayIndex, current);
  }
  if (byDay.size === 0) return null;

  const [dayIndex, best] = [...byDay.entries()].reduce((winner, entry) =>
    entry[1].total / entry[1].count > winner[1].total / winner[1].count
      ? entry
      : winner,
  );
  return {
    label: dayNames[dayIndex] ?? `Gün ${dayIndex}`,
    value: best.total / best.count,
    sampleCount: best.samples,
  };
}
